import { useState, useRef } from 'react';

const ITUNES_API = 'https://itunes.apple.com/search';

function formatDuration(ms) {
  if (!ms) return '';
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function Music({ t }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [playing, setPlaying] = useState(null);
  const [downloading, setDownloading] = useState(null);
  const audioRef = useRef(null);

  const search = async (e) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    setResults([]);
    try {
      const url = `${ITUNES_API}?term=${encodeURIComponent(query)}&media=music&entity=song&limit=16&country=fr`;
      const res = await fetch(url);
      const data = await res.json();
      if (!data.results?.length) {
        setError(t.musicNoResults || 'Aucun résultat. Essaie un autre titre.');
      } else {
        setResults(data.results);
      }
    } catch {
      setError(t.musicError || 'Erreur de connexion. Réessaie.');
    } finally {
      setLoading(false);
    }
  };

  const playPreview = (track) => {
    if (!track.previewUrl) return;
    if (playing === track.trackId) {
      audioRef.current?.pause();
      setPlaying(null);
      return;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = track.previewUrl;
      audioRef.current.play().catch(() => {});
      setPlaying(track.trackId);
      audioRef.current.onended = () => setPlaying(null);
    }
  };

  const downloadPreview = async (track) => {
    if (!track.previewUrl) {
      alert('Aperçu non disponible pour ce titre.');
      return;
    }
    setDownloading(track.trackId);
    try {
      const res = await fetch(track.previewUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${track.artistName} - ${track.trackName} (preview).m4a`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert('Erreur lors du téléchargement.');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="page music-page">
      <audio ref={audioRef} />

      <div className="page-header">
        <h2 className="page-title">🎵 {t.musicTitle || 'Musique'}</h2>
        <p className="page-sub">{t.musicSub || 'Recherche et télécharge des extraits musicaux'}</p>
      </div>

      {/* Search bar */}
      <form onSubmit={search} className="music-search-form">
        <div className="music-search-wrap">
          <span className="music-search-icon">🔍</span>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t.musicPlaceholder || 'Artiste, titre de chanson...'}
            className="music-search-input"
          />
          {query && (
            <button type="button" className="music-clear-btn" onClick={() => { setQuery(''); setResults([]); }}>✕</button>
          )}
        </div>
        <button type="submit" className="btn-primary btn-pink" disabled={loading || !query.trim()}>
          {loading ? <span className="mini-spinner" /> : (t.musicSearch || 'Rechercher')}
        </button>
      </form>

      {/* Popular searches */}
      {!results.length && !loading && !error && (
        <div className="quick-searches">
          <p className="quick-label">{t.musicPopular || '🔥 Recherches populaires'}</p>
          <div className="quick-tags">
            {['Afrobeat', 'Maes', 'Burna Boy', 'Aya Nakamura', 'Ninho', 'Drake', 'Wizkid', 'Davido'].map(q => (
              <button key={q} className="quick-tag" onClick={() => { setQuery(q); setTimeout(() => document.querySelector('.music-search-form')?.requestSubmit?.(), 100); }}>
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="music-error">⚠️ {error}</div>
      )}

      {loading && (
        <div className="center-col" style={{ padding: '32px 0' }}>
          <div className="spinner pink-spinner" />
          <p style={{ color: 'rgba(240,244,255,0.5)', marginTop: 12 }}>{t.musicLoading || 'Recherche en cours...'}</p>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="music-results">
          <p className="results-count">🎵 {results.length} {t.musicResults || 'résultats'}</p>
          {results.map(track => (
            <div key={track.trackId} className="music-card">
              <img
                src={track.artworkUrl100}
                alt={track.trackName}
                className="music-thumb"
                onError={e => { e.target.src = 'https://via.placeholder.com/60'; }}
              />
              <div className="music-info">
                <p className="music-title">{track.trackName}</p>
                <p className="music-artist">{track.artistName}</p>
                <p className="music-meta">
                  {track.primaryGenreName} • {formatDuration(track.trackTimeMillis)}
                </p>
              </div>
              <div className="music-actions">
                {track.previewUrl ? (
                  <button
                    className={`music-play-btn ${playing === track.trackId ? 'playing' : ''}`}
                    onClick={() => playPreview(track)}
                    title="Écouter l'aperçu (30s)">
                    {playing === track.trackId ? '⏸' : '▶'}
                  </button>
                ) : null}
                <button
                  className="music-dl-btn"
                  onClick={() => downloadPreview(track)}
                  disabled={downloading === track.trackId}
                  title="Télécharger l'aperçu">
                  {downloading === track.trackId ? <span className="mini-spinner pink" /> : '⬇'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="music-notice">
        <p>💡 {t.musicNotice || 'Les téléchargements sont des aperçus de 30 secondes via iTunes. Pour les titres complets, utilise les commandes du bot WhatsApp (.ytdl, .song).'}</p>
      </div>
    </div>
  );
}
