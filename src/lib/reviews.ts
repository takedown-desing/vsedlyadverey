// Вымышленные отзывы (клиент на вопрос об отзывах не ответил, ждём реальные). НЕ размечаются schema.org (Review/AggregateRating), помечены на сайте.
import data from '../data/content/reviews.json';
export type Review = { name: string; city: string; date: string; rating: number; product: string; productName: string; text: string };
export const REVIEWS = (data as { reviews: Review[] }).reviews;
export const REVIEWS_NOTE = (data as { note: string }).note;
export const RATING = Math.round((REVIEWS.reduce((s, r) => s + r.rating, 0) / REVIEWS.length) * 10) / 10;
export const ratingStr = RATING.toFixed(1).replace('.', ',');
