import { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: any) {
    console.error("[ErrorBoundary]", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 px-4">
          <div className="w-12 h-12 rounded-xl bg-[#EF4444]/10 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-[#EF4444]" />
          </div>
          <div className="text-center max-w-md">
            <h2 className="text-lg font-bold text-white mb-1">Seite konnte nicht geladen werden</h2>
            <p className="text-sm text-[#94A3B8] mb-1">{this.state.error?.message}</p>
            <p className="text-xs text-[#475569] font-mono">{this.state.error?.stack?.split("\n")[1]?.trim()}</p>
          </div>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
            className="flex items-center gap-2 bg-[#0A66C2] hover:bg-[#1A8CD8] text-white font-semibold px-5 py-2 rounded-lg transition text-sm"
          >
            <RefreshCw className="w-4 h-4" /> Seite neu laden
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
