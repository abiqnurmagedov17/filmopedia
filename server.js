const express = require('express');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE = 'https://api.themoviedb.org/3';

// Setup EJS dengan folder views/pages dan views/partials
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// ===== HELPER =====
async function fetchTMDB(endpoint, params = {}) {
  try {
    const response = await axios.get(`${TMDB_BASE}${endpoint}`, {
      params: { api_key: API_KEY, ...params }
    });
    return response.data;
  } catch (error) {
    console.error('TMDB Error:', error.message);
    return null;
  }
}

// ===== ROUTES =====

// 1. HOMEPAGE
app.get('/', async (req, res) => {
  try {
    const [trending, nowPlaying, topRated, upcoming, popular] = await Promise.all([
      fetchTMDB('/trending/movie/day', { page: 1 }),
      fetchTMDB('/movie/now_playing', { page: 1 }),
      fetchTMDB('/movie/top_rated', { page: 1 }),
      fetchTMDB('/movie/upcoming', { page: 1 }),
      fetchTMDB('/movie/popular', { page: 1 })
    ]);

    res.render('pages/index', {
      trending: trending?.results?.slice(0, 10) || [],
      nowPlaying: nowPlaying?.results?.slice(0, 4) || [],
      topRated: topRated?.results?.slice(0, 4) || [],
      upcoming: upcoming?.results?.slice(0, 4) || [],
      popular: popular?.results?.slice(0, 4) || [],
      hero: nowPlaying?.results?.slice(0, 5) || []
    });
  } catch (error) {
    console.error('Homepage error:', error);
    res.status(500).send('Error loading homepage');
  }
});

// 2. TRENDING
app.get('/movies/trending', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const window = req.query.window === 'week' ? 'week' : 'day';
    const data = await fetchTMDB(`/trending/movie/${window}`, { page });
    
    res.render('pages/movies', {
      movies: data?.results?.slice(0, 8) || [],
      title: 'Trending',
      currentPage: page,
      totalPages: Math.min(data?.total_pages || 1, 500),
      basePath: '/movies/trending',
      window: window,
      isLoading: false
    });
  } catch (error) {
    console.error('Trending error:', error);
    res.status(500).send('Error loading trending');
  }
});

// 3. POPULAR
app.get('/movies/popular', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const data = await fetchTMDB('/movie/popular', { page });
    
    res.render('pages/movies', {
      movies: data?.results?.slice(0, 8) || [],
      title: 'Popular',
      currentPage: page,
      totalPages: Math.min(data?.total_pages || 1, 500),
      basePath: '/movies/popular',
      window: 'day',
      isLoading: false
    });
  } catch (error) {
    console.error('Popular error:', error);
    res.status(500).send('Error loading popular');
  }
});

// 4. TOP RATED
app.get('/movies/top', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const data = await fetchTMDB('/movie/top_rated', { page });
    
    res.render('pages/movies', {
      movies: data?.results?.slice(0, 8) || [],
      title: 'Top Rated',
      currentPage: page,
      totalPages: Math.min(data?.total_pages || 1, 500),
      basePath: '/movies/top',
      window: 'day',
      isLoading: false
    });
  } catch (error) {
    console.error('Top Rated error:', error);
    res.status(500).send('Error loading top rated');
  }
});

// 5. UPCOMING
app.get('/movies/upcoming', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const data = await fetchTMDB('/movie/upcoming', { page });
    
    res.render('pages/movies', {
      movies: data?.results?.slice(0, 8) || [],
      title: 'Upcoming',
      currentPage: page,
      totalPages: Math.min(data?.total_pages || 1, 500),
      basePath: '/movies/upcoming',
      window: 'day',
      isLoading: false
    });
  } catch (error) {
    console.error('Upcoming error:', error);
    res.status(500).send('Error loading upcoming');
  }
});

// 6. NOW PLAYING
app.get('/movies/now-playing', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const data = await fetchTMDB('/movie/now_playing', { page });
    
    res.render('pages/movies', {
      movies: data?.results?.slice(0, 8) || [],
      title: 'Now Playing',
      currentPage: page,
      totalPages: Math.min(data?.total_pages || 1, 500),
      basePath: '/movies/now-playing',
      window: 'day',
      isLoading: false
    });
  } catch (error) {
    console.error('Now Playing error:', error);
    res.status(500).send('Error loading now playing');
  }
});

// 7. DISCOVER
app.get('/movies/discover', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const genre = req.query.genre;
    const year = req.query.year;
    const sort = req.query.sort || 'popularity.desc';
    
    const params = { page, sort_by: sort };
    if (genre) params.with_genres = genre;
    if (year) params.primary_release_year = year;
    
    const [data, genres] = await Promise.all([
      fetchTMDB('/discover/movie', params),
      fetchTMDB('/genre/movie/list')
    ]);
    
    res.render('pages/discover', {
      movies: data?.results?.slice(0, 8) || [],
      genres: genres?.genres || [],
      currentPage: page,
      totalPages: Math.min(data?.total_pages || 1, 500),
      basePath: '/movies/discover',
      selectedGenre: genre || null,
      selectedYear: year || null,
      selectedSort: sort
    });
  } catch (error) {
    console.error('Discover error:', error);
    res.status(500).send('Error loading discover');
  }
});

// 8. MOVIE DETAIL
app.get('/movie/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const [movie, credits, videos, similar, recommendations] = await Promise.all([
      fetchTMDB(`/movie/${id}`),
      fetchTMDB(`/movie/${id}/credits`),
      fetchTMDB(`/movie/${id}/videos`),
      fetchTMDB(`/movie/${id}/similar`, { page: 1 }),
      fetchTMDB(`/movie/${id}/recommendations`, { page: 1 })
    ]);

    if (!movie) return res.status(404).send('Movie not found');

    const trailers = videos?.results?.filter(
      v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
    ) || [];

    res.render('pages/movie', {
      movie,
      credits: credits || { cast: [], crew: [] },
      videos: trailers.slice(0, 6),
      similar: similar?.results?.slice(0, 10) || [],
      recommendations: recommendations?.results?.slice(0, 10) || []
    });
  } catch (error) {
    console.error('Movie detail error:', error);
    res.status(500).send('Error loading movie detail');
  }
});

// 9. SEARCH
app.get('/search', async (req, res) => {
  const query = req.query.q?.trim();
  
  if (!query) {
    return res.render('pages/search', { movies: [], query: null });
  }

  try {
    const data = await fetchTMDB('/search/movie', { query, page: 1 });
    res.render('pages/search', { 
      movies: data?.results || [], 
      query 
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).send('Error searching');
  }
});

// 10. API GENRES
app.get('/api/genres', async (req, res) => {
  try {
    const data = await fetchTMDB('/genre/movie/list');
    res.json({ genres: data?.genres || [] });
  } catch {
    res.json({ genres: [] });
  }
});

// 11. API DISCOVER
app.get('/api/discover', async (req, res) => {
  const { genre, year, sort, page = 1 } = req.query;
  
  const params = {
    page: parseInt(page),
    sort_by: sort || 'popularity.desc'
  };
  if (genre) params.with_genres = genre;
  if (year) params.primary_release_year = year;

  try {
    const data = await fetchTMDB('/discover/movie', params);
    res.json({ results: data?.results || [] });
  } catch {
    res.json({ results: [] });
  }
});

// ===== START =====
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});