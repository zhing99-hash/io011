import { useSearchStore } from '../stores/searchStore';
import { LoadingSpinner, ProgressLoader } from './LoadingSpinner';
import type { StepStatus } from '../types/search';

const STEPS = [
  { key: 'parse' as const, title: 'Parse', icon: '1' },
  { key: 'match' as const, title: 'Match', icon: '2' },
  { key: 'products' as const, title: 'Products', icon: '3' },
];

function getStepIcon(status: StepStatus, icon: string): React.ReactNode {
  if (status === 'completed') {
    return (
      <span className="flex items-center justify-center w-7 h-7 rounded-full bg-green-500 text-white">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      </span>
    );
  }
  if (status === 'in-progress') {
    return <LoadingSpinner size="sm" />;
  }
  if (status === 'error') {
    return (
      <span className="flex items-center justify-center w-7 h-7 rounded-full bg-red-500 text-white">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </span>
    );
  }
  return (
    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-200 text-gray-500">
      {icon}
    </span>
  );
}

function getConnectorClass(currentStatus: StepStatus, nextStatus: StepStatus): string {
  if (currentStatus === 'completed') return 'w-full bg-primary';
  if (nextStatus === 'in-progress' || currentStatus === 'in-progress') return 'w-1/2 bg-primary';
  return 'w-0 bg-primary';
}

export function SearchProgress() {
  const { progress } = useSearchStore();
  const { currentStep, steps } = progress;

  if (currentStep === 0) {
    return null;
  }

  return (
    <div className="w-full bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-500 rounded-xl">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-800">Search Progress</h2>
      </div>

      <div className="flex items-center justify-between mb-8">
        {STEPS.map((step, index) => {
          const stepData = steps[step.key];
          const isActive = stepData.status === 'in-progress';
          const isCompleted = stepData.status === 'completed';
          const isLast = index === STEPS.length - 1;
          const nextStepKey = STEPS[index + 1]?.key;
          const nextStepData = nextStepKey ? steps[nextStepKey] : null;

          return (
            <div key={step.key} className="flex items-center flex-1">
              <div className="flex flex-col items-center relative z-10">
                <div className="transition-all duration-500 transform">
                  {getStepIcon(stepData.status, step.icon)}
                </div>
                <span className="mt-2 text-sm font-medium">
                  {isActive || isCompleted ? 'text-blue-500' : 'text-gray-400'}
                </span>
                <span className={`mt-2 text-sm font-medium ${isActive || isCompleted ? 'text-blue-500' : 'text-gray-400'}`}>
                  {step.title}
                </span>
              </div>

              {!isLast && nextStepData && (
                <div className="flex-1 mx-2 h-1 rounded-full bg-gray-200 relative overflow-hidden">
                  <div
                    className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ${getConnectorClass(stepData.status, nextStepData.status)}`}
                    style={{ transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="space-y-4">
        {/* Step 1 */}
        <div className="p-4 rounded-xl border">
          {steps.parse.status === 'in-progress' && 'bg-blue-50 border-blue-200'}
          {steps.parse.status === 'completed' && 'bg-green-50 border-green-200'}
          {steps.parse.status === 'pending' && 'bg-gray-50 border-gray-100'}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-gray-600">Step 1/3: Parse</span>
            {steps.parse.status === 'completed' && <span className="text-green-500">OK</span>}
          </div>

          {steps.parse.status === 'completed' && steps.parse.category && (
            <div className="flex flex-wrap gap-3 mt-3">
              {steps.parse.category && (
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-500 text-white text-sm">
                  Category: {steps.parse.category}
                </span>
              )}
              {steps.parse.tags && steps.parse.tags.length > 0 && (
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm">
                  Tags: {steps.parse.tags.join(', ')}
                </span>
              )}
              {steps.parse.budget && (
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm">
                  Budget: {steps.parse.budget.min}-{steps.parse.budget.max}
                </span>
              )}
            </div>
          )}
          {steps.parse.status === 'in-progress' && (
            <div className="flex items-center gap-2 text-gray-500 mt-2">
              <LoadingSpinner size="sm" text="Parsing..." />
            </div>
          )}
          {steps.parse.status === 'pending' && (
            <p className="text-gray-400 text-sm mt-1">{steps.parse.description}</p>
          )}
        </div>

        {/* Step 2 */}
        <div className="p-4 rounded-xl border">
          {steps.match.status === 'in-progress' && 'bg-blue-50 border-blue-200'}
          {steps.match.status === 'completed' && 'bg-green-50 border-green-200'}
          {steps.match.status === 'pending' && 'bg-gray-50 border-gray-100'}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-gray-600">Step 2/3: Match Merchants</span>
            {steps.match.status === 'completed' && steps.match.merchants && (
              <span className="text-green-500">Found {steps.match.merchants.length} merchants</span>
            )}
          </div>

          {steps.match.status === 'completed' && steps.match.merchants && (
            <ul className="mt-3 space-y-2">
              {steps.match.merchants.map((merchant) => (
                <li key={merchant.id} className="flex items-center gap-3 p-2 rounded-lg bg-white">
                  <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span className="text-gray-700 font-medium">{merchant.name}</span>
                  <span className="text-gray-400 text-sm">[{merchant.location} | {merchant.rating}]</span>
                </li>
              ))}
            </ul>
          )}
          {steps.match.status === 'in-progress' && (
            <div className="flex items-center gap-2 text-gray-500 mt-2">
              <LoadingSpinner size="sm" text="Matching..." />
            </div>
          )}
          {steps.match.status === 'pending' && (
            <p className="text-gray-400 text-sm mt-1">{steps.match.description}</p>
          )}
        </div>

        {/* Step 3 */}
        <div className="p-4 rounded-xl border">
          {steps.products.status === 'in-progress' && 'bg-blue-50 border-blue-200'}
          {steps.products.status === 'completed' && 'bg-green-50 border-green-200'}
          {steps.products.status === 'pending' && 'bg-gray-50 border-gray-100'}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-gray-600">Step 3/3: Get Products</span>
            {steps.products.status === 'completed' && <span className="text-green-500">OK</span>}
          </div>

          {steps.products.status === 'in-progress' && (
            <div className="mt-3 space-y-2">
              <ProgressLoader progress={steps.products.progress || 0} />
              {steps.products.returnedMerchants !== undefined && steps.products.totalMerchants !== undefined && (
                <p className="text-gray-500 text-sm">
                  Returned {steps.products.returnedMerchants}/{steps.products.totalMerchants} merchants
                </p>
              )}
            </div>
          )}
          {steps.products.status === 'completed' && (
            <p className="text-green-600 text-sm mt-2">Products ready!</p>
          )}
          {steps.products.status === 'pending' && (
            <p className="text-gray-400 text-sm mt-1">{steps.products.description}</p>
          )}
        </div>
      </div>
    </div>
  );
}