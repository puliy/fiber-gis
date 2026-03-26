import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import MapPage from "./pages/MapPage";
import AdminPage from "./pages/AdminPage";
import TemplatesPage from "./pages/TemplatesPage";
import PublicMapPage from "./pages/PublicMapPage";
import SplicePassportPage from "./pages/SplicePassportPage";
import OpticalCrossPage from "./pages/OpticalCrossPage";
import FiberTracePage from "./pages/FiberTracePage";
import EquipmentPage from "./pages/EquipmentPage";
import ImportPage from "./pages/ImportPage";

function Router() {
  return (
    <Switch>
      <Route path="/" component={MapPage} />
      <Route path="/admin" component={AdminPage} />
      <Route path="/templates" component={TemplatesPage} />
      <Route path="/splice/:id" component={SplicePassportPage} />
      <Route path="/cross/:id" component={OpticalCrossPage} />
      <Route path="/trace" component={FiberTracePage} />
      <Route path="/equipment" component={EquipmentPage} />
      <Route path="/import" component={ImportPage} />
      <Route path="/public/:token" component={PublicMapPage} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
