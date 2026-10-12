/** Persistence shape for the `wishlists` collection in the Aurelis ER model. */
export interface WishlistRecord {
	_id: string;
	memberId: string;
	yachtId: string;
	createdAt: Date;
	updatedAt: Date;
}
