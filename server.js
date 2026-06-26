const express = require('express');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE = 'https://api.themoviedb.org/3';

// Setup EJS sebagai template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Helper: fetch dari TMDB
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

// ============= ROUTES =============

// Halaman Utama
app.get('/', async (req, res) => {
  try {
    const [trending, nowPlaying, topRated] = await Promise.all([
      fetchTMDB('/trending/movie/day', { page: 1 }),
      fetchTMDB('/movie/now_playing', { page: 1 }),
      fetchTMDB('/movie/top_rated', { page: 1 })
    ]);

    res.render('index', {
      trending: trending?.results?.slice(0, 10) || [],
      nowPlaying: nowPlaying?.results?.slice(0, 4) || [],
      topRated: topRated?.results?.slice(0, 4) || [],
      hero: nowPlaying?.results?.slice(0, 5) || []
    });
  } catch (error) {
    res.status(500).send('Error loading homepage');
  }
});

// Daftar Film (Popular, Trending, Top Rated, Upcoming, Now Playing)
app.get('/movies/:list', async (req, res) => {
  const { list } = req.params;
  const page = parseInt(req.query.page) || 1;
  
  const endpoints = {
    popular: '/movie/popular',
    trending: '/trending/movie/day',
    top: '/movie/top_rated',
    upcoming: '/movie/upcoming',
    'now-playing': '/movie/now_playing'
  };

  const endpoint = endpoints[list];
  if (!endpoint) return res.status(404).send('List not found');

  try {
    const data = await fetchTMDB(endpoint, { page });
    const title = list.replace('-', ' ').toUpperCase();
    
    res.render('movies', {
      movies: data?.results?.slice(0, 8) || [],
      title,
      currentPage: page,
      totalPages: Math.min(data?.total_pages || 1, 500),
      basePath: `/movies/${list}`
    });
  } catch (error) {
    res.status(500).send('Error loading movies');
  }
});

// Detail Film
app.get('/movie/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const [movie, credits, videos] = await Promise.all([
      fetchTMDB(`/movie/${id}`),
      fetchTMDB(`/movie/${id}/credits`),
      fetchTMDB(`/movie/${id}/videos`)
    ]);

    if (!movie) return res.status(404).send('Movie not found');

    // Filter trailer YouTube
    const trailers = videos?.results?.filter(
      v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
    ) || [];

    // Similar & Recommendations
    const [similar, recommendations] = await Promise.all([
      fetchTMDB(`/movie/${id}/similar`, { page: 1 }),
      fetchTMDB(`/movie/${id}/recommendations`, { page: 1 })
    ]);

    res.render('movie', {
      movie,
      credits: credits || { cast: [], crew: [] },
      videos: trailers.slice(0, 6),
      similar: similar?.results?.slice(0, 10) || [],
      recommendations: recommendations?.results?.slice(0, 10) || []
    });
  } catch (error) {
    res.status(500).send('Error loading movie detail');
  }
});

// Pencarian
app.get('/search', async (req, res) => {
  const query = req.query.q?.trim();
  
  if (!query) {
    return res.render('search', { movies: [], query: null });
  }

  try {
    const data = await fetchTMDB('/search/movie', { query, page: 1 });
    res.render('search', { 
      movies: data?.results || [], 
      query 
    });
  } catch (error) {
    res.status(500).send('Error searching');
  }
});

// API endpoint untuk genres (dipakai JavaScript client)
app.get('/api/genres', async (req, res) => {
  try {
    const data = await fetchTMDB('/genre/movie/list');
    res.json({ genres: data?.genres || [] });
  } catch {
    res.json({ genres: [] });
  }
});

// API endpoint untuk discover (filter)
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

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});