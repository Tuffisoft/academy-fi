import { WelcomeSlide } from "@/components/fi/presentation/slides/1-welcome-slide";
import { InternetSlide } from "@/components/fi/presentation/slides/2-internet-slide";
import { StudioFiIntroSlide } from "@/components/fi/presentation/slides/3-studio-fi-intro-slide";
import { StackSlide } from "@/components/fi/presentation/slides/4-stack-slide";
import { ClientsSlide } from "@/components/fi/presentation/slides/5-clients-slide";

// Order here controls the order the slides play in
export const slides = [
  <WelcomeSlide key="welcome" />,
  <InternetSlide key="internet" />,
  <StudioFiIntroSlide key="studio-fi-intro" />,
  <StackSlide key="stack" />,
  <ClientsSlide key="clients" />,
];
