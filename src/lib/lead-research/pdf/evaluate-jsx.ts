import { parseExpression } from "@babel/parser";
import type * as AST from "@babel/types";
import { createElement, Fragment, type ComponentType, type ReactNode } from "react";

export class PdfTemplateError extends Error {}
type Scope = Record<string, unknown>;
const forbidden = new Set(["__proto__", "prototype", "constructor"]);
function fail(message: string): never { throw new PdfTemplateError(message); }

/** Interpret declarative JSX. No eval, imports, globals, arbitrary calls or JS execution. */
export function evaluatePdfJsx(source: string, components: Record<string, ComponentType<never>>, report: unknown): ReactNode {
  if (source.length > 60_000) fail("The template is too large.");
  let root: AST.Expression;
  try { root = parseExpression(source, { plugins: ["jsx"] }); }
  catch (error) { fail(error instanceof Error ? error.message : "Invalid JSX."); }
  let budget = 30_000;
  let pages = 0;
  const evaluate = (node: AST.Node | null | undefined, scope: Scope, depth = 0): unknown => {
    if (!node) return undefined;
    if (--budget < 0 || depth > 70) fail("The template is too complex.");
    const next = (child: AST.Node | null | undefined) => evaluate(child, scope, depth + 1);
    switch (node.type) {
      case "StringLiteral":
      case "BooleanLiteral": return node.value;
      case "NumericLiteral":
        if (!Number.isFinite(node.value) || Math.abs(node.value) > 10_000) fail("Number outside the supported range.");
        return node.value;
      case "NullLiteral": return null;
      case "Identifier":
        if (node.name === "undefined") return undefined;
        if (Object.hasOwn(scope, node.name) && !forbidden.has(node.name)) return scope[node.name];
        return fail(`Unknown variable: ${node.name}`);
      case "MemberExpression": {
        const object = next(node.object);
        const key = node.computed ? next(node.property) : (node.property as AST.Identifier).name;
        if ((typeof key !== "string" && typeof key !== "number") || forbidden.has(String(key))) fail("Unsupported property.");
        if (typeof object === "string" && key === "length") return object.length;
        if (object && typeof object === "object" && Object.hasOwn(object, String(key))) {
          const value = (object as Scope)[String(key)];
          if (typeof value !== "function") return value;
        }
        return fail(`Unknown property: ${String(key)}`);
      }
      case "ObjectExpression": {
        const result: Scope = Object.create(null);
        for (const property of node.properties) {
          if (property.type !== "ObjectProperty" || property.computed) fail("Use plain style objects.");
          const key = property.key.type === "Identifier" ? property.key.name : property.key.type === "StringLiteral" || property.key.type === "NumericLiteral" ? String(property.key.value) : fail("Unsupported object key.");
          if (forbidden.has(key)) fail("Unsupported object key.");
          result[key] = next(property.value);
        }
        return result;
      }
      case "ArrayExpression": return node.elements.map(item => next(item));
      case "ConditionalExpression": return next(node.test) ? next(node.consequent) : next(node.alternate);
      case "LogicalExpression": {
        const left = next(node.left);
        if (node.operator === "&&") return left && next(node.right);
        if (node.operator === "||") return left || next(node.right);
        return left ?? next(node.right);
      }
      case "BinaryExpression": {
        const left = next(node.left); const right = next(node.right);
        if (node.operator === "===") return left === right;
        if (node.operator === "!==") return left !== right;
        if (node.operator === "+" && (typeof left === "string" || typeof right === "string")) return String(left) + String(right);
        if (typeof left === "number" && typeof right === "number") {
          if (node.operator === "+") return left + right;
          if (node.operator === "-") return left - right;
          if (node.operator === "<") return left < right;
          if (node.operator === ">") return left > right;
          if (node.operator === "<=") return left <= right;
          if (node.operator === ">=") return left >= right;
        }
        return fail(`Unsupported operator: ${node.operator}`);
      }
      case "UnaryExpression": {
        const value = next(node.argument);
        if (node.operator === "!") return !value;
        if (node.operator === "-" && typeof value === "number") return -value;
        return fail("Unsupported operator.");
      }
      case "CallExpression": {
        if (node.callee.type !== "MemberExpression" || node.callee.computed || node.callee.property.type !== "Identifier" || node.callee.property.name !== "map") fail("Only array.map() is supported.");
        const array = next(node.callee.object);
        const callback = node.arguments[0];
        if (!Array.isArray(array) || array.length > 100 || node.arguments.length !== 1 || callback?.type !== "ArrowFunctionExpression" || callback.async || callback.body.type === "BlockStatement" || callback.params.length > 2 || callback.params.some(param => param.type !== "Identifier" || forbidden.has(param.name))) fail("Use array.map(item => JSX).");
        return array.map((value, index) => {
          const local = { ...scope };
          callback.params.forEach((param, i) => { local[(param as AST.Identifier).name] = i === 0 ? value : index; });
          return evaluate(callback.body, local, depth + 1);
        });
      }
      case "JSXExpressionContainer": return next(node.expression);
      case "JSXEmptyExpression": return null;
      case "JSXText": return /[\r\n]/.test(node.value) ? node.value.replace(/\s+/g, " ").trim() || null : node.value;
      case "JSXFragment": return createElement(Fragment, null, ...node.children.map(child => next(child) as ReactNode));
      case "JSXElement": {
        const opening = node.openingElement;
        if (opening.name.type !== "JSXIdentifier" || !Object.hasOwn(components, opening.name.name)) fail("Use the available PDFCN components.");
        const name = opening.name.name;
        if (name === "Page" && ++pages > 100) fail("Too many pages.");
        const props: Scope = {};
        const allowed = new Set(["key", "style", "title", "author", "subject", "size", "margin", "orientation", "variant", "level", "padding", "wrap", "gap", "color", "align", "weight", "children", "italic", "decoration", "transform", "noMargin", "tracking", "keepWithNext", "spacing", "background", "border", "accentColor", "noWrap"]);
        for (const attribute of opening.attributes) {
          if (attribute.type !== "JSXAttribute" || attribute.name.type !== "JSXIdentifier" || !allowed.has(attribute.name.name)) fail("Unsupported component property.");
          props[attribute.name.name] = attribute.value ? next(attribute.value) : true;
        }
        return createElement(components[name], props as never, ...node.children.map(child => next(child) as ReactNode));
      }
      default: return fail(`Unsupported syntax: ${node.type}`);
    }
  };
  if (root!.type !== "JSXElement" || root!.openingElement.name.type !== "JSXIdentifier" || root!.openingElement.name.name !== "Document") fail("Start the template with <Document>.");
  return evaluate(root!, { report }) as ReactNode;
}
