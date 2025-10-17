import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import SearchForm from './components/SearchForm';
import ResultsList from './components/ResultsList';
import CareerNavBar from './components/CareerNavBar';
import Footer from './components/Footer';
import AuthModal from './components/AuthModal';
import MyCareerPage from './components/MyCareerPage';
import CareerBanner from './components/CareerBanner';
import ToastContainer from './components/ToastContainer';
import { JobListing, JobSearchQuery, User, SavedSearch, Toast } from './types';
import { findJobs, generateCareerImage } from './services/geminiService';

type Page = 'main' | 'myCareer';

const App: React.FC = () => {
  const [jobListings, setJobListings] = useState<JobListing[]>([]);
  const [currentJobIndex, setCurrentJobIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [activeCareer, setActiveCareer] = useState<string | null>(null);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState<Page>('main');

  const [favorites, setFavorites] = useState<JobListing[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [currentSearchQuery, setCurrentSearchQuery] = useState<JobSearchQuery | null>(null);

  // Visual Aid State
  const [careerBannerUrl, setCareerBannerUrl] = useState<string | null>(null);
  const [isBannerLoading, setIsBannerLoading] = useState(false);
  
  // Toast State
  const [toasts, setToasts] = useState<Omit<Toast, 'onDismiss'>[]>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Effect to check for a logged-in user on initial load
  useEffect(() => {
    const loggedInUser = localStorage.getItem('currentUser');
    if (loggedInUser) {
      const user = JSON.parse(loggedInUser);
      setCurrentUser(user);
      loadUserData(user.username);
    }
  }, []);
  
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`favoriteJobs_${currentUser.username}`, JSON.stringify(favorites));
      localStorage.setItem(`savedSearches_${currentUser.username}`, JSON.stringify(savedSearches));
    }
  }, [favorites, savedSearches, currentUser]);

  const loadUserData = (username: string) => {
    const savedFavorites = localStorage.getItem(`favoriteJobs_${username}`);
    setFavorites(savedFavorites ? JSON.parse(savedFavorites) : []);
    const savedSearchesData = localStorage.getItem(`savedSearches_${username}`);
    setSavedSearches(savedSearchesData ? JSON.parse(savedSearchesData) : []);
  };

  const handleSearch = async (query: JobSearchQuery) => {
    setIsLoading(true);
    setIsBannerLoading(true);
    setError(null);
    setHasSearched(true);
    setJobListings([]);
    setCurrentJobIndex(0);
    setCareerBannerUrl(null);
    setActiveCareer(query.careerField);
    setCurrentSearchQuery(query);
    setCurrentPage('main');

    try {
      const jobsPromise = findJobs(query);
      const imagePromise = generateCareerImage(query.careerField);

      try {
        const base64Image = await imagePromise;
        setCareerBannerUrl(`data:image/png;base64,${base64Image}`);
      } catch (imgErr) {
        console.error("Career banner generation failed:", imgErr);
      } finally {
        setIsBannerLoading(false);
      }

      const results = await jobsPromise;
      if (results.length === 0) {
        setError("No jobs found for your query. Try different keywords.");
      } else {
        setJobListings(results);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCareerSelect = (career: string) => {
    handleSearch({ careerField: career, location: 'South Africa' });
  };

  const handleToggleFavorite = (job: JobListing) => {
    if (!currentUser) {
      addToast("Please sign in to save jobs.", 'error');
      return;
    }
    setFavorites(prev => {
      const isFavorite = prev.some(fav => fav.url === job.url);
      if (isFavorite) {
        addToast("Job removed from favorites.", 'info');
        return prev.filter(fav => fav.url !== job.url);
      } else {
        addToast("Job added to favorites!", 'success');
        return [...prev, job];
      }
    });
  };
  
  const handleSaveSearch = () => {
    if (!currentUser || !currentSearchQuery) return;
    const isAlreadySaved = savedSearches.some(s => 
      s.query.careerField === currentSearchQuery.careerField &&
      s.query.location === currentSearchQuery.location
    );
    if (isAlreadySaved) {
        addToast("This search is already saved.", 'info');
        return;
    }
    const newSavedSearch: SavedSearch = {
      id: Date.now().toString(),
      query: currentSearchQuery,
    };
    setSavedSearches(prev => [...prev, newSavedSearch]);
    addToast("Search saved successfully!", 'success');
  };
  
  const handleDeleteSearch = (id: string) => {
    setSavedSearches(prev => prev.filter(s => s.id !== id));
    addToast("Saved search removed.", 'info');
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('currentUser', JSON.stringify(user));
    loadUserData(user.username);
    setIsAuthModalOpen(false);
    setCurrentPage('myCareer');
    addToast(`Welcome back, ${user.fullName.split(' ')[0]}!`, 'success');
  };

  const handleRegister = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('currentUser', JSON.stringify(user));
    setFavorites([]);
    setSavedSearches([]);
    localStorage.setItem(`favoriteJobs_${user.username}`, JSON.stringify([]));
    localStorage.setItem(`savedSearches_${user.username}`, JSON.stringify([]));
    setIsAuthModalOpen(false);
    setCurrentPage('myCareer');
    addToast("Registration successful! Welcome.", 'success');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setFavorites([]);
    setSavedSearches([]);
    setCurrentSearchQuery(null);
    localStorage.removeItem('currentUser');
    setCurrentPage('main');
    addToast("You have been logged out.", 'info');
  };

  const getPageLetter = (): string => {
      if (currentPage === 'myCareer') return 'B';
      if (currentPage === 'main' && jobListings.length > 0) {
        return String.fromCharCode(67 + currentJobIndex);
      }
      return 'A';
  };

  return (
    <div className="bg-gray-900 text-gray-200 min-h-screen flex flex-col font-sans">
      <Header
        pageLetter={getPageLetter()}
        currentUser={currentUser}
        onSignInClick={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        onNavigate={setCurrentPage}
      />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentPage === 'main' && (
          <div className="space-y-8">
            <SearchForm onSearch={handleSearch} isLoading={isLoading} />
            <CareerNavBar onCareerSelect={handleCareerSelect} activeCareer={activeCareer} />
            <CareerBanner isLoading={isBannerLoading} imageUrl={careerBannerUrl} />
            <ResultsList
              currentUser={currentUser}
              currentJob={jobListings.length > 0 ? jobListings[currentJobIndex] : null}
              currentIndex={currentJobIndex}
              totalJobs={jobListings.length}
              onNextPage={() => setCurrentJobIndex(i => Math.min(i + 1, jobListings.length - 1))}
              onPreviousPage={() => setCurrentJobIndex(i => Math.max(i - 1, 0))}
              isLoading={isLoading}
              error={error}
              hasSearched={hasSearched}
              favorites={favorites}
              onToggleFavorite={handleToggleFavorite}
              onSaveSearch={handleSaveSearch}
            />
          </div>
        )}
        {currentPage === 'myCareer' && currentUser && (
            <MyCareerPage 
                user={currentUser}
                favorites={favorites}
                onToggleFavorite={handleToggleFavorite}
                savedSearches={savedSearches}
                onRerunSearch={handleSearch}
                onDeleteSearch={handleDeleteSearch}
            />
        )}
      </main>
      <Footer />
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLogin={handleLogin}
        onRegister={handleRegister}
        addToast={addToast}
      />
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
};

export default App;