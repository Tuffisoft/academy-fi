import { WelcomeSlide } from "@/components/fi/presentation/slides/1-welcome-slide";
import { InternetSlide } from "@/components/fi/presentation/slides/2-internet-slide";
import { StudioFiIntroSlide } from "@/components/fi/presentation/slides/3-studio-fi-intro-slide";
import { StackSlide } from "@/components/fi/presentation/slides/4-stack-slide";
import { ClientsSlide } from "@/components/fi/presentation/slides/5-clients-slide";
import { StrengthsWeaknessesSlide } from "@/components/fi/presentation/slides/6-strengths-weaknesses-slide";
import { RolesFutureSlide } from "@/components/fi/presentation/slides/7-roles-future-slide";
import { HouseRulesSlide } from "@/components/fi/presentation/slides/8-house-rules-slide";
import { ProductSlide } from "@/components/fi/presentation/slides/9-product-slide";
import { ChallengeBreakSlide } from "@/components/fi/presentation/slides/10-challenge-break-slide";
import { StrategySlide } from "@/components/fi/presentation/slides/11-strategy-slide";
import { ClientAcquisitionSlide } from "@/components/fi/presentation/slides/11b-client-acquisition-slide";
import { DiscussionSlide } from "@/components/fi/presentation/slides/12-discussion-slide";
import { AcademyFiPanelSlide } from "@/components/fi/presentation/slides/13-academy-fi-panel-slide";
import { WrapUpSlide } from "@/components/fi/presentation/slides/14-wrap-up-slide";

// Order here controls the order the slides play in
export const slides = [
  <WelcomeSlide key="welcome" />,
  <InternetSlide key="internet" />,
  <StudioFiIntroSlide key="studio-fi-intro" />,
  <StackSlide key="stack" />,
  <ClientsSlide key="clients" />,
  <StrengthsWeaknessesSlide key="strengths-weaknesses" />,
  <RolesFutureSlide key="roles-future" />,
  <HouseRulesSlide key="house-rules" />,
  <ProductSlide key="product" />,
  <ChallengeBreakSlide key="challenge-break" />,
  <DiscussionSlide key="discussion" />,
  <StrategySlide key="strategy" />,
  <ClientAcquisitionSlide key="client-acquisition" />,
  <AcademyFiPanelSlide key="academy-fi-panel" />,
  <WrapUpSlide key="wrap-up" />,
];
