import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Link, useParams } from 'react-router-dom'
import './App.css'

const API_KEY = '8baeb6d1'
const API_BASE_URL = `https://www.omdbapi.com/?apikey=${API_KEY}`

function useFavorites() {
  const [favoriteIds, setFavoriteIds] = useState(() => {
    if (typeof window === 'undefined') return []
    try {
      const stored = window.localStorage.getItem('favoriteMovieIds')
      if (!stored) return []
      const parsed = JSON.parse(stored)
      if (!Array.isArray(parsed)) return []
      return parsed
    } catch {
      return []
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem('favoriteMovieIds', JSON.stringify(favoriteIds))
    } catch {
    }
  }, [favoriteIds])

  const addFavorite = (id) => {
    setFavoriteIds((prev) => {
      if (prev.includes(id)) return prev
      return [...prev, id]
    })
  }

  const removeFavorite = (id) => {
    setFavoriteIds((prev) => prev.filter((item) => item !== id))
  }

  return { favoriteIds, addFavorite, removeFavorite }
}

function Navbar({ favoritesCount }) {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/">Movie Explorer</Link>
      </div>
      <div className="navbar-links">
        <Link to="/">Home</Link>
        <Link to="/favorites">Favorites ({favoritesCount})</Link>
        <Link to="/about">About</Link>
      </div>
    </nav>
  )
}

function MovieCard({ movie, isFavorite, onAddFavorite, onRemoveFavorite }) {
  const handleFavoriteClick = () => {
    if (isFavorite) {
      onRemoveFavorite(movie.imdbID)
    } else {
      onAddFavorite(movie.imdbID)
    }
  }

  return (
    <div className="movie-card">
      {movie.Poster && movie.Poster !== 'N/A' && (
        <img src={movie.Poster} alt={movie.Title} className="movie-poster" />
      )}
      <h3 className="movie-title">{movie.Title}</h3>
      <p className="movie-year">{movie.Year}</p>
      <div className="movie-actions">
        <Link to={`/movie/${movie.imdbID}`} className="button">
          View Details
        </Link>
        <button type="button" className="button" onClick={handleFavoriteClick}>
          {isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
        </button>
      </div>
    </div>
  )
}

function HomePage({ favoriteIds, onAddFavorite, onRemoveFavorite }) {
  const [searchTerm, setSearchTerm] = useState('batman')
  const [movies, setMovies] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [yearFilter, setYearFilter] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)

  const fetchMovies = async (query, requestedPage = 1, append = false) => {
    if (!query) return
    setLoading(true)
    setError('')
    try {
      const url = `${API_BASE_URL}&s=${encodeURIComponent(query)}&page=${requestedPage}`
      const response = await fetch(url)
      const data = await response.json()

      if (data.Response === 'True') {
        const results = data.Search || []
        setMovies((prev) => (append ? [...prev, ...results] : results))

        const totalResults = Number.parseInt(data.totalResults || '0', 10)
        const loadedCount = (append ? movies.length : 0) + results.length
        setHasMore(loadedCount < totalResults)
      } else {
        if (!append) {
          setMovies([])
        }
        setHasMore(false)
        setError(data.Error || 'No movies found.')
      }
    } catch {
      if (!append) {
        setMovies([])
      }
      setHasMore(false)
      setError('Failed to fetch movies. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMovies(searchTerm, 1, false)
    setPage(1)
  }, [])

  const handleSearchSubmit = (event) => {
    event.preventDefault()
    setPage(1)
    fetchMovies(searchTerm, 1, false)
  }

  const handleLoadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchMovies(searchTerm, nextPage, true)
  }

  const filteredMovies = movies.filter((movie) => {
    if (!yearFilter) return true
    return movie.Year === yearFilter
  })

  return (
    <div className="page">
      <h1>Search Movies</h1>
      <form className="search-form" onSubmit={handleSearchSubmit}>
        <input
          type="text"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search by title"
        />
        <button type="submit">Search</button>
      </form>

      <div className="filters">
        <label>
          Filter by year:
          <input
            type="text"
            value={yearFilter}
            onChange={(event) => setYearFilter(event.target.value)}
            placeholder="e.g. 2010"
          />
        </label>
      </div>

      {loading && <p>Loading movies...</p>}
      {error && !loading && <p className="error">{error}</p>}

      {!loading && !error && filteredMovies.length === 0 && (
        <p>No movies found.</p>
      )}

      <div className="movie-grid">
        {filteredMovies.map((movie) => (
          <MovieCard
            key={movie.imdbID}
            movie={movie}
            isFavorite={favoriteIds.includes(movie.imdbID)}
            onAddFavorite={onAddFavorite}
            onRemoveFavorite={onRemoveFavorite}
          />
        ))}
      </div>

      {!loading && hasMore && filteredMovies.length > 0 && (
        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <button type="button" className="button" onClick={handleLoadMore}>
            Load more movies
          </button>
        </div>
      )}
    </div>
  )
}

function MovieDetailsPage({ favoriteIds, onAddFavorite, onRemoveFavorite }) {
  const { id } = useParams()
  const [movie, setMovie] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchMovie = async () => {
      setLoading(true)
      setError('')
      try {
        const url = `${API_BASE_URL}&i=${encodeURIComponent(id)}`
        const response = await fetch(url)
        const data = await response.json()

        if (data.Response === 'True') {
          setMovie(data)
        } else {
          setError(data.Error || 'Movie not found.')
        }
      } catch {
        setError('Failed to fetch movie details. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchMovie()
    }
  }, [id])

  const isFavorite = movie && favoriteIds.includes(movie.imdbID)

  const handleFavoriteClick = () => {
    if (!movie) return
    if (isFavorite) {
      onRemoveFavorite(movie.imdbID)
    } else {
      onAddFavorite(movie.imdbID)
    }
  }

  if (loading) {
    return (
      <div className="page">
        <p>Loading movie details...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page">
        <p className="error">{error}</p>
      </div>
    )
  }

  if (!movie) {
    return (
      <div className="page">
        <p>No movie data available.</p>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="movie-details">
        {movie.Poster && movie.Poster !== 'N/A' && (
          <img src={movie.Poster} alt={movie.Title} className="movie-details-poster" />
        )}
        <div className="movie-details-info">
          <h1>{movie.Title}</h1>
          <p><strong>Year:</strong> {movie.Year}</p>
          <p><strong>Genre:</strong> {movie.Genre}</p>
          <p><strong>Rating:</strong> {movie.imdbRating}</p>
          <p><strong>Plot:</strong> {movie.Plot}</p>
          <button type="button" className="button" onClick={handleFavoriteClick}>
            {isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
          </button>
        </div>
      </div>
    </div>
  )
}

function FavoritesPage({ favoriteIds, onAddFavorite, onRemoveFavorite }) {
  const [movies, setMovies] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadFavorites = async () => {
      if (!favoriteIds.length) {
        setMovies([])
        setError('')
        return
      }

      setLoading(true)
      setError('')

      try {
        const requests = favoriteIds.map((id) =>
          fetch(`${API_BASE_URL}&i=${encodeURIComponent(id)}`).then((response) => response.json()),
        )

        const results = await Promise.all(requests)
        const validMovies = results.filter((item) => item && item.Response === 'True')

        setMovies(validMovies)
        if (!validMovies.length) {
          setError('No valid favorite movies found.')
        }
      } catch {
        setMovies([])
        setError('Failed to load favorite movies.')
      } finally {
        setLoading(false)
      }
    }

    loadFavorites()
  }, [favoriteIds])

  if (!favoriteIds.length) {
    return (
      <div className="page">
        <h1>Favorite Movies</h1>
        <p>No favorite movies added.</p>
      </div>
    )
  }

  return (
    <div className="page">
      <h1>Favorite Movies</h1>

      {loading && <p>Loading favorites...</p>}
      {error && !loading && <p className="error">{error}</p>}

      {!loading && !error && movies.length === 0 && (
        <p>No favorite movies to display.</p>
      )}

      <div className="movie-grid">
        {movies.map((movie) => (
          <MovieCard
            key={movie.imdbID}
            movie={movie}
            isFavorite={favoriteIds.includes(movie.imdbID)}
            onAddFavorite={onAddFavorite}
            onRemoveFavorite={onRemoveFavorite}
          />
        ))}
      </div>
    </div>
  )
}

function AboutPage() {
  return (
    <div className="page">
      <h1>About Movie Explorer</h1>
      <p>
        Movie Explorer lets you search movies, view details, and save your favorites
        using the OMDb API.
      </p>
      <p>
        Use the search box on the Home page to find movies, open the details page
        for more information, and manage your favorites from any page.
      </p>
    </div>
  )
}

function App() {
  const { favoriteIds, addFavorite, removeFavorite } = useFavorites()

  return (
    <BrowserRouter>
      <Navbar favoritesCount={favoriteIds.length} />
      <Routes>
        <Route
          path="/"
          element={(
            <HomePage
              favoriteIds={favoriteIds}
              onAddFavorite={addFavorite}
              onRemoveFavorite={removeFavorite}
            />
          )}
        />
        <Route
          path="/movie/:id"
          element={(
            <MovieDetailsPage
              favoriteIds={favoriteIds}
              onAddFavorite={addFavorite}
              onRemoveFavorite={removeFavorite}
            />
          )}
        />
        <Route
          path="/favorites"
          element={(
            <FavoritesPage
              favoriteIds={favoriteIds}
              onAddFavorite={addFavorite}
              onRemoveFavorite={removeFavorite}
            />
          )}
        />
        <Route path="/about" element={<AboutPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
