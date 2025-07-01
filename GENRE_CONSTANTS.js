// Shared Genre Constants for Pitara Platform
// Can be used by both Admin Panel and Mobile App

export const PITARA_GENRES = {
  // Popular Indian Web Series Genres
  ACTION: { value: "action", label: "🎬 Action", hindi: "एक्शन" },
  COMEDY: { value: "comedy", label: "😂 Comedy", hindi: "कॉमेडी" },
  DRAMA: { value: "drama", label: "🎭 Drama", hindi: "ड्रामा" },
  THRILLER: { value: "thriller", label: "😱 Thriller", hindi: "थ्रिलर" },
  ROMANCE: { value: "romance", label: "💕 Romance", hindi: "रोमांस" },
  CRIME: { value: "crime", label: "🔍 Crime", hindi: "क्राइम" },
  HORROR: { value: "horror", label: "👻 Horror", hindi: "हॉरर" },
  SCI_FI: { value: "sci-fi", label: "🚀 Sci-Fi", hindi: "साइ-फाई" },
  FANTASY: { value: "fantasy", label: "🔮 Fantasy", hindi: "फैंटेसी" },
  FAMILY: { value: "family", label: "👨‍👩‍👧‍👦 Family", hindi: "पारिवारिक" },
  MYSTERY: { value: "mystery", label: "🔍 Mystery", hindi: "रहस्य" },
  BIOGRAPHY: { value: "biography", label: "📖 Biography", hindi: "जीवनी" },
  DOCUMENTARY: { value: "documentary", label: "📹 Documentary", hindi: "वृत्तचित्र" },
  HISTORICAL: { value: "historical", label: "🏛️ Historical", hindi: "ऐतिहासिक" },
  MUSICAL: { value: "musical", label: "🎵 Musical", hindi: "संगीत" },
  ADVENTURE: { value: "adventure", label: "🗺️ Adventure", hindi: "रोमांच" },
  PSYCHOLOGICAL: { value: "psychological", label: "🧠 Psychological", hindi: "मनोवैज्ञानिक" },
  SUPERNATURAL: { value: "supernatural", label: "👻 Supernatural", hindi: "अलौकिक" },
  POLITICAL: { value: "political", label: "🏛️ Political", hindi: "राजनीतिक" },
  SPORTS: { value: "sports", label: "⚽ Sports", hindi: "खेल" }
}

// Helper Functions
export const getGenreOptions = () => {
  return Object.values(PITARA_GENRES).map(genre => ({
    value: genre.value,
    label: genre.label
  }))
}

export const getGenreLabel = (genreValue) => {
  const genre = Object.values(PITARA_GENRES).find(g => g.value === genreValue)
  return genre ? genre.label : genreValue
}

export const getGenreHindi = (genreValue) => {
  const genre = Object.values(PITARA_GENRES).find(g => g.value === genreValue)
  return genre ? genre.hindi : genreValue
}

// Genre validation
export const isValidGenre = (genreValue) => {
  return Object.values(PITARA_GENRES).some(g => g.value === genreValue)
}

// Default genre
export const DEFAULT_GENRE = PITARA_GENRES.DRAMA.value

// Popular genres for quick access
export const POPULAR_GENRES = [
  PITARA_GENRES.DRAMA.value,
  PITARA_GENRES.COMEDY.value,
  PITARA_GENRES.ACTION.value,
  PITARA_GENRES.THRILLER.value,
  PITARA_GENRES.ROMANCE.value
] 