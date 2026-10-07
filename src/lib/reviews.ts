// Отзывы редактируются в админке (раздел «Отзывы», файл src/cms/reviews.json).
// Пока отзывы вымышленные, они помечены на сайте и НЕ размечаются schema.org (Review/AggregateRating).
import data from '../cms/reviews.json';
export type Review = { name: string; city: string; date: string; rating: number; product: string; productName: string; text: string };
export const REVIEWS = ((data as { reviews?: Review[] }).reviews || []).filter((r) => r && r.text);
export const REVIEWS_NOTE = (data as { note?: string }).note || '';
export const RATING = REVIEWS.length ? Math.round((REVIEWS.reduce((s, r) => s + r.rating, 0) / REVIEWS.length) * 10) / 10 : 0;
export const ratingStr = RATING.toFixed(1).replace('.', ',');
