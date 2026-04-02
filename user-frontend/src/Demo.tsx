import { useState } from 'react';
import { SearchInput, SearchProgress, SearchError, LoadingSpinner } from './components';
import { useSearchStore } from './stores/searchStore';
import './App.css';

// 模拟搜索流程
function simulateSearchFlow(onComplete: () => void) {
  const store = useSearchStore.getState();
  const { progress } = store;
  const { setIsLoading } = store;
  
  progress.startSearch();
  
  setTimeout(() => {
    progress.setStepStatus('parse', 'completed');
    progress.setStepData('parse', {
      category: '茶具',
      tags: ['手工', '景德镇'],
      budget: { min: 100, max: 200 },
    });
    
    progress.setStepStatus('match', 'in-progress');
    
    setTimeout(() => {
      progress.setStepStatus('match', 'completed');
      progress.setStepData('match', {
        merchants: [
          { id: '1', name: '老茶铺工作室', location: '景德镇', rating: 4.8 },
          { id: '2', name: '青瓷工坊', location: '龙泉', rating: 4.9 },
          { id: '3', name: '手工茶具坊', location: '宜兴', rating: 4.7 },
        ],
      });
      
      progress.setStepStatus('products', 'in-progress');
      
      let progressPercent = 0;
      const progressInterval = setInterval(() => {
        progressPercent += 20;
        progress.setStepData('products', {
          progress: progressPercent,
          totalMerchants: 3,
          returnedMerchants: Math.ceil((progressPercent / 100) * 3),
        });
        
        if (progressPercent >= 100) {
          clearInterval(progressInterval);
          progress.setStepStatus('products', 'completed');
          setIsLoading(false);
          onComplete();
        }
      }, 500);
    }, 1500);
  }, 1500);
}

function simulateTimeout() {
  const store = useSearchStore.getState();
  const { progress } = store;
  
  progress.startSearch();
  progress.setStepStatus('parse', 'in-progress');
  
  setTimeout(() => {
    progress.setTimeout(true);
    progress.setStepStatus('parse', 'error');
    progress.setError({
      message: '搜索超时',
      details: '服务器在 30 秒内未响应，请检查网络后重试',
      code: 'TIMEOUT',
    });
  }, 5000);
}

function Demo() {
  const store = useSearchStore();
  const progress = store.progress;
  const [showError, setShowError] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = (_query: string) => {
    if (isSearching) return;
    
    setIsSearching(true);
    
    simulateSearchFlow(() => {
      setIsSearching(false);
    });
  };

  const handleErrorDemo = () => {
    setShowError(true);
    simulateTimeout();
  };

  const handleClearError = () => {
    setShowError(false);
    progress.reset();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <header className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-blue-500 flex items-center gap-2">
            <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            IO011 接口演示 Demo
          </h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-bold text-gray-900 mb-3">
            搜索流程演示
          </h2>
          <p className="text-gray-500 text-lg">
            展示搜索进度、状态管理与结果展示
          </p>
        </div>

        <div className="mb-8">
          <SearchInput
            onSearch={handleSearch}
            placeholder="输入搜索内容..."
          />
        </div>

        {isSearching && (
          <div className="mb-8">
            <LoadingSpinner text="搜索中..." />
          </div>
        )}

        {progress.currentStep > 0 && !showError && (
          <div className="mb-8">
            <SearchProgress />
          </div>
        )}

        {showError && progress.error && (
          <div className="mb-8">
            <SearchError 
              error={progress.error} 
              isTimeout={progress.isTimeout}
              onRetry={() => {
                handleClearError();
                handleSearch('测试搜索');
              }}
              onCancel={handleClearError}
            />
          </div>
        )}

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">功能演示</h3>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => handleSearch('茶具')}
              disabled={isSearching}
              className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50"
            >
              模拟正常搜索
            </button>
            <button
              onClick={handleErrorDemo}
              disabled={isSearching}
              className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 disabled:opacity-50"
            >
              模拟超时错误
            </button>
            <button
              onClick={() => {
                progress.reset();
                setIsSearching(false);
                setShowError(false);
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300"
            >
              重置状态
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Demo;