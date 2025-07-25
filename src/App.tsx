import React, { useState } from 'react';
import { HomePage } from './pages/HomePage';
import { RechargePage } from './pages/RechargePage';
import { HistoryPage } from './pages/HistoryPage';

type Page = 'home' | 'recharge' | 'history';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return (
          <HomePage
            onStartRecharge={() => setCurrentPage('recharge')}
            onViewHistory={() => setCurrentPage('history')}
          />
        );
      case 'recharge':
        return <RechargePage />;
      case 'history':
        return <HistoryPage onBack={() => setCurrentPage('home')} />;
      default:
        return <HomePage onStartRecharge={() => setCurrentPage('recharge')} onViewHistory={() => setCurrentPage('history')} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="container mx-auto">
        {renderPage()}
      </div>
    </div>
  );
}

export default App;