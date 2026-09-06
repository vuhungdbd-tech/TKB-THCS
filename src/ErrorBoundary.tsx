import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetCache = () => {
    try {
      localStorage.removeItem('activeTab');
      localStorage.removeItem('timetableData');
      localStorage.removeItem('resultViewMode');
      localStorage.removeItem('resultSelectedId');
    } catch (e) {
      console.error(e);
    }
    window.location.reload();
  };

  private handleFullReset = () => {
    if (window.confirm('Hành động này sẽ xóa toàn bộ bộ nhớ tạm (cache) và đăng nhập lại. Bạn có muốn tiếp tục?')) {
      try {
        localStorage.clear();
      } catch (e) {
        console.error(e);
      }
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || 'Đã có lỗi phát sinh trong giao diện';
      const errorStack = this.state.error?.stack || '';

      return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
          <div className="max-w-xl w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8 text-center">
            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-inner">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-slate-900 mb-2">
              Khôi phục sự cố giao diện
            </h2>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Ứng dụng phát hiện lỗi hiển thị hoặc bộ nhớ đệm trình duyệt bị xung đột. Vui lòng bấm <strong>Tải lại trang</strong> hoặc <strong>Xóa bộ nhớ đệm</strong> để tiếp tục sử dụng ngay.
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-6 text-left max-h-40 overflow-y-auto">
              <div className="text-xs font-bold text-rose-700 font-mono break-words mb-1">
                {errorMessage}
              </div>
              {errorStack && (
                <pre className="text-[10px] text-slate-500 font-mono whitespace-pre-wrap leading-tight">
                  {errorStack.slice(0, 500)}
                </pre>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={this.handleReload}
                className="w-full sm:w-auto px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                Tải lại trang
              </button>
              <button
                onClick={this.handleResetCache}
                className="w-full sm:w-auto px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-sm shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                title="Khôi phục trạng thái tab và dữ liệu hiển thị"
              >
                <Home className="w-4 h-4" />
                Về Cấu hình & Xóa đệm
              </button>
              <button
                onClick={this.handleFullReset}
                className="w-full sm:w-auto px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                title="Xóa toàn bộ localStorage"
              >
                <Trash2 className="w-4 h-4 text-rose-500" />
                Đặt lại toàn bộ
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
