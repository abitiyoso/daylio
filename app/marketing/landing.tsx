"use client";
import { useEffect } from "react";
import {
  ApprovedIcons,
  Header,
  Main,
  Footer,
  InformationDialog,
} from "./sections";
import { initializeMarketing } from "./interactions";
export default function Landing() {
  useEffect(() => initializeMarketing(), []);
  return (
    <div className="v20-site">
      <link rel="stylesheet" href="/marketing-v20/styles.css" />
      <ApprovedIcons />
      <Header />
      <Main />
      <Footer />
      <InformationDialog />
    </div>
  );
}
