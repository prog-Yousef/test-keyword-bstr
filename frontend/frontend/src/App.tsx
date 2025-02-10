// src/App.tsx
import { useState } from 'react';
import './App.css';

interface KeywordResult {
  word: string;
  occurrences: number;
  averagePerJob: string;
}

interface ApiResponse {
  totalJobsAnalyzed: number;
  keywordAnalysis: {
    title: string;
    topKeywords: KeywordResult[];
  };
}

function App() {
  
  const [limit, setLimit] = useState('10');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState('https://api-alpha-prod.bostr.se:8443/user/v1/search/jobads');

  const analyzeKeywords = async () => {
    setLoading(true);
    setError(null);
   
    try {
      // Säkerställ att vi har en bas-URL
      if (!url) {
        throw new Error('Vänligen ange en API URL');
      }

      const finalUrl = `${url}${url.includes('?') ? '&' : '?'}offset=0&limit=${limit}`;
      console.log('Sending request with URL:', finalUrl); // Debug logging

      const response = await fetch('http://localhost:5000/keywords-from-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: finalUrl,
          method: 'POST'
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server response:', errorText); // Debug logging
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Received data:', data); // Debug logging
      setResults(data);
    } catch (err) {
      console.error('Error details:', err); // Debug logging
      setError(err instanceof Error ? err.message : 'Ett fel uppstod');
    } finally {
      setLoading(false);
    }
};

  return (
    <div className="container">
      <h1>Jobbannons Nyckelordsanalys</h1>
      
      <div className="input-group">
  <label>
    API URL:
    <input
      type="text"
      value={url}
      onChange={(e) => setUrl(e.target.value)}
      placeholder="https://api-alpha-prod.bostr.se:8443/user/v1/search/jobads"
      className="url-input"
      style={{ width: '400px' }} // Gör fältet bredare för bättre synlighet
    />
        </label>
      </div>

      <div className="input-group">
        <label>
          Antal annonser:
          <input
            type="number"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            placeholder="Antal annonser att analysera"
            min="1"
          />
        </label>
      </div>

      <button
  onClick={analyzeKeywords}
  disabled={loading}
  className="analyze-button"
>
  {loading ? (
    <>
      Analyserar...
      <span className="loading-indicator">⟳</span>
    </>
  ) : (
    'Analysera'
  )}
</button>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {results && (
        <div className="results-container">
          <h2>Resultat från {results.totalJobsAnalyzed} annonser</h2>
          
          <div className="keywords-list">
            {results.keywordAnalysis.topKeywords.map((keyword, index) => (
              <div key={index} className="keyword-item">
                <span className="rank">#{index + 1}</span>
                <div className="keyword-details">
                  <span className="word">{keyword.word}</span>
                  <span className="stats">
                    Förekomster: {keyword.occurrences} 
                    (i snitt {keyword.averagePerJob} per annons)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;