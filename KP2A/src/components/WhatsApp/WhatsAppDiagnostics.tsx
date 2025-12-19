import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../UI/Card';
import { Button } from '../UI/Button';
import Badge from '../UI/Badge';
import { Alert, AlertDescription } from '../UI/Alert';
import { 
  Activity, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Wifi, 
  WifiOff,
  Server,
  Clock,
  Zap
} from 'lucide-react';
import whatsappSocketService from '../../services/whatsapp-socket.service';

interface DiagnosticResult {
  name: string;
  status: 'success' | 'warning' | 'error' | 'info';
  message: string;
  details?: any;
  timestamp: string;
}

interface NetworkTest {
  name: string;
  url: string;
  method: 'GET' | 'POST';
  expectedStatus?: number;
}

export default function WhatsAppDiagnostics() {
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [lastRun, setLastRun] = useState<Date | null>(null);

  const networkTests: NetworkTest[] = [
    {
      name: 'Backend Health Check',
      url: 'http://localhost:3001/health',
      method: 'GET',
      expectedStatus: 200
    },
    {
      name: 'WhatsApp Status API',
      url: 'http://localhost:3001/api/whatsapp/status',
      method: 'GET',
      expectedStatus: 200
    },
    {
      name: 'Socket.IO Connection',
      url: 'http://localhost:3001/socket.io/',
      method: 'GET',
      expectedStatus: 200
    }
  ];

  const runDiagnostics = async () => {
    setIsRunning(true);
    setDiagnostics([]);
    const results: DiagnosticResult[] = [];

    try {
      // 1. Check Socket Connection
      addResult(results, 'Socket Connection', () => {
        const isConnected = whatsappSocketService.isSocketConnected();
        return {
          status: isConnected ? 'success' : 'error',
          message: isConnected ? 'Socket terhubung dengan baik' : 'Socket tidak terhubung',
          details: { connected: isConnected }
        };
      });

      // 2. Check Backend Health
      await addAsyncResult(results, 'Backend Health', async () => {
        try {
          const healthCheck = await whatsappSocketService.checkBackendHealth();
          return {
            status: healthCheck.healthy ? 'success' : 'error',
            message: healthCheck.healthy ? 'Backend sehat' : `Backend error: ${healthCheck.error}`,
            details: healthCheck
          };
        } catch (error: any) {
          return {
            status: 'error',
            message: `Backend tidak dapat diakses: ${error.message}`,
            details: { error: error.message }
          };
        }
      });

      // 3. Network Tests
      for (const test of networkTests) {
        await addAsyncResult(results, test.name, async () => {
          try {
            const response = await fetch(test.url, {
              method: test.method,
              timeout: 5000
            } as RequestInit);
            
            const isSuccess = test.expectedStatus ? 
              response.status === test.expectedStatus : 
              response.ok;
            
            return {
              status: isSuccess ? 'success' : 'warning',
              message: `Status: ${response.status} ${response.statusText}`,
              details: {
                status: response.status,
                statusText: response.statusText,
                url: test.url,
                method: test.method
              }
            };
          } catch (error: any) {
            return {
              status: 'error',
              message: `Network error: ${error.message}`,
              details: { error: error.message, url: test.url }
            };
          }
        });
      }

      // 4. Check WhatsApp Status
      await addAsyncResult(results, 'WhatsApp Status', async () => {
        try {
          const status = await whatsappSocketService.getStatus();
          return {
            status: status.isConnected ? 'success' : 'info',
            message: `Status: ${status.status} | Connected: ${status.isConnected}`,
            details: status
          };
        } catch (error: any) {
          return {
            status: 'error',
            message: `Gagal mendapatkan status: ${error.message}`,
            details: { error: error.message }
          };
        }
      });

      // 5. Check Connection Stats
      addResult(results, 'Connection Statistics', () => {
        const stats = whatsappSocketService.getConnectionStats();
        return {
          status: stats.isConnected ? 'success' : 'warning',
          message: `Connected: ${stats.isConnected} | Reconnect attempts: ${stats.reconnectAttempts}/${stats.maxReconnectAttempts}`,
          details: stats
        };
      });

      // 6. Browser Environment Check
      addResult(results, 'Browser Environment', () => {
        const userAgent = navigator.userAgent;
        const isSecureContext = window.isSecureContext;
        const hasWebSocket = 'WebSocket' in window;
        
        const issues = [];
        if (!isSecureContext && window.location.protocol !== 'http:') {
          issues.push('Not in secure context (HTTPS required for production)');
        }
        if (!hasWebSocket) {
          issues.push('WebSocket not supported');
        }

        return {
          status: issues.length === 0 ? 'success' : 'warning',
          message: issues.length === 0 ? 'Browser environment OK' : `Issues: ${issues.join(', ')}`,
          details: {
            userAgent,
            isSecureContext,
            hasWebSocket,
            protocol: window.location.protocol,
            issues
          }
        };
      });

      // 7. Memory and Performance Check
      addResult(results, 'Performance Metrics', () => {
        const performance = window.performance;
        const memory = (performance as any).memory;
        
        const details: any = {
          navigationTiming: performance.timing ? {
            loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
            domReady: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart
          } : null
        };

        if (memory) {
          details.memory = {
            used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
            total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
            limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024)
          };
        }

        return {
          status: 'info',
          message: memory ? 
            `Memory: ${details.memory.used}MB / ${details.memory.total}MB` : 
            'Performance metrics available',
          details
        };
      });

    } catch (error: any) {
      results.push({
        name: 'Diagnostic Error',
        status: 'error',
        message: `Error running diagnostics: ${error.message}`,
        details: { error: error.message },
        timestamp: new Date().toISOString()
      });
    }

    setDiagnostics(results);
    setLastRun(new Date());
    setIsRunning(false);
  };

  const addResult = (results: DiagnosticResult[], name: string, testFn: () => { status: DiagnosticResult['status']; message: string; details?: any }) => {
    try {
      const result = testFn();
      results.push({
        name,
        status: result.status,
        message: result.message,
        details: result.details,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      results.push({
        name,
        status: 'error',
        message: `Test failed: ${error.message}`,
        details: { error: error.message },
        timestamp: new Date().toISOString()
      });
    }
  };

  const addAsyncResult = async (results: DiagnosticResult[], name: string, testFn: () => Promise<{ status: DiagnosticResult['status']; message: string; details?: any }>) => {
    try {
      const result = await testFn();
      results.push({
        name,
        status: result.status,
        message: result.message,
        details: result.details,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      results.push({
        name,
        status: 'error',
        message: `Test failed: ${error.message}`,
        details: { error: error.message },
        timestamp: new Date().toISOString()
      });
    }
  };

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'info': return <Activity className="w-4 h-4 text-blue-500" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getStatusBadgeVariant = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success': return 'default';
      case 'warning': return 'secondary';
      case 'error': return 'destructive';
      case 'info': return 'outline';
      default: return 'outline';
    }
  };

  const getSummary = () => {
    const total = diagnostics.length;
    const success = diagnostics.filter(d => d.status === 'success').length;
    const warnings = diagnostics.filter(d => d.status === 'warning').length;
    const errors = diagnostics.filter(d => d.status === 'error').length;
    
    return { total, success, warnings, errors };
  };

  // Auto-run diagnostics on component mount
  useEffect(() => {
    runDiagnostics();
  }, []);

  const summary = getSummary();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">WhatsApp System Diagnostics</h2>
          <p className="text-muted-foreground">
            Comprehensive system health check and troubleshooting tools
          </p>
        </div>
        <Button 
          onClick={runDiagnostics} 
          disabled={isRunning}
          className="flex items-center gap-2"
        >
          {isRunning ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Zap className="w-4 h-4" />
          )}
          {isRunning ? 'Running...' : 'Run Diagnostics'}
        </Button>
      </div>

      {/* Summary */}
      {diagnostics.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Tests</p>
                  <p className="text-2xl font-bold">{summary.total}</p>
                </div>
                <Activity className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Success</p>
                  <p className="text-2xl font-bold text-green-600">{summary.success}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Warnings</p>
                  <p className="text-2xl font-bold text-yellow-600">{summary.warnings}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Errors</p>
                  <p className="text-2xl font-bold text-red-600">{summary.errors}</p>
                </div>
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Last Run Info */}
      {lastRun && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            Last diagnostic run: {lastRun.toLocaleString('id-ID')}
            {summary.errors > 0 && (
              <span className="ml-2 text-red-600 font-medium">
                ⚠️ {summary.errors} error(s) detected
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Diagnostic Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="w-5 h-5" />
            Diagnostic Results
          </CardTitle>
          <CardDescription>
            Detailed system health check results
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isRunning ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
              <span className="ml-2 text-lg">Running diagnostics...</span>
            </div>
          ) : diagnostics.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Click "Run Diagnostics" to start system health check
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {diagnostics.map((diagnostic, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(diagnostic.status)}
                      <span className="font-medium">{diagnostic.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusBadgeVariant(diagnostic.status)}>
                        {diagnostic.status.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(diagnostic.timestamp).toLocaleTimeString('id-ID')}
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-sm mb-2">{diagnostic.message}</p>
                  
                  {diagnostic.details && (
                    <details className="mt-2">
                      <summary className="text-xs text-muted-foreground cursor-pointer">
                        Show Details
                      </summary>
                      <pre className="text-xs text-muted-foreground mt-2 p-2 bg-muted rounded whitespace-pre-wrap">
                        {JSON.stringify(diagnostic.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common troubleshooting actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              onClick={() => whatsappSocketService.reconnect()}
              className="flex items-center gap-2"
            >
              <Wifi className="w-4 h-4" />
              Reconnect Socket
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => whatsappSocketService.forceReconnect()}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Force Reconnect
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Reload Page
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}