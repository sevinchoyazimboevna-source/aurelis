# Step 17 complete API inventory

Verified 2026-10-09 against the isolated local stack. PASS means a real successful invocation/received event and its exercised assertions passed; it does not certify every possible input or production deployment. Google successful external sign-in remains UNVERIFIED; its invalid-token live rejection and offline linking/config tests passed.

## GraphQL Queries (34)

| Operation | Live status | Tracked successful calls | Tracked rejections |
|---|---|---:|---:|
| sayHello | PASS | 1 | 0 |
| getMe | PASS | 3 | 4 |
| getMyConversations | PASS | 4 | 4 |
| getConversation | PASS | 8 | 4 |
| getConversationMessages | PASS | 7 | 5 |
| getBrokerProfiles | PASS | 4 | 4 |
| getBrokerProfile | PASS | 1 | 0 |
| getOffices | PASS | 4 | 4 |
| getOffice | PASS | 1 | 1 |
| getFeaturedOffices | PASS | 4 | 4 |
| getOfficesForAdmin | PASS | 4 | 5 |
| getYachts | PASS | 47 | 6 |
| getFeaturedYachts | PASS | 4 | 4 |
| getYacht | PASS | 9 | 2 |
| getYachtsForStaff | PASS | 4 | 5 |
| getDestinations | PASS | 4 | 4 |
| getDestination | PASS | 3 | 0 |
| getFeaturedDestinations | PASS | 4 | 4 |
| getDestinationsForAdmin | PASS | 4 | 5 |
| getYachtInquiries | PASS | 2 | 1 |
| getYachtInquiriesPage | PASS | 4 | 5 |
| getYachtInquiry | PASS | 1 | 2 |
| getCrews | PASS | 5 | 4 |
| getCrew | PASS | 2 | 4 |
| getFeaturedCrews | PASS | 4 | 4 |
| getCrewsForStaff | PASS | 4 | 5 |
| getArticles | PASS | 4 | 4 |
| getArticle | PASS | 3 | 7 |
| getFeaturedArticles | PASS | 4 | 4 |
| getArticlesForAdmin | PASS | 4 | 5 |
| getMyWishlist | PASS | 6 | 4 |
| isYachtWishlisted | PASS | 1 | 1 |
| getSellYachtRequestsForAdmin | PASS | 4 | 5 |
| getSellYachtRequest | PASS | 1 | 1 |

## GraphQL Mutations (28)

| Operation | Live status | Successful calls | Rejections verified |
|---|---|---:|---:|
| register | PASS | 5 | 5 |
| login | PASS | 4 | 5 |
| googleLogin | UNVERIFIED | 0 | 1 |
| logout | PASS | 1 | 1 |
| startYachtConversation | PASS | 3 | 4 |
| sendMessage | PASS | 7 | 6 |
| markConversationRead | PASS | 1 | 2 |
| saveBrokerProfile | PASS | 3 | 1 |
| createOffice | PASS | 1 | 1 |
| updateOffice | PASS | 2 | 2 |
| recordYachtView | PASS | 11 | 2 |
| createYacht | PASS | 5 | 1 |
| updateYacht | PASS | 7 | 2 |
| createDestination | PASS | 3 | 1 |
| updateDestination | PASS | 1 | 3 |
| submitYachtInquiry | PASS | 1 | 1 |
| submitSalesInquiry | PASS | 2 | 8 |
| submitCharterInquiry | PASS | 2 | 4 |
| updateYachtInquiry | PASS | 1 | 1 |
| createCrewProfile | PASS | 2 | 2 |
| updateCrewProfile | PASS | 6 | 1 |
| createArticle | PASS | 4 | 1 |
| updateArticle | PASS | 9 | 1 |
| addYachtToWishlist | PASS | 11 | 0 |
| removeYachtFromWishlist | PASS | 5 | 0 |
| toggleYachtWishlist | PASS | 2 | 0 |
| submitSellYachtRequest | PASS | 1 | 14 |
| updateSellYachtRequestStatus | PASS | 1 | 1 |

## Socket events

| Event | Live status | Evidence |
|---|---|---|
| socket:ready | PASS | 6 accepted/received, 0 rejected |
| message:send | PASS | 2 accepted/received, 2 rejected |
| message:new | PASS | 3 accepted/received, 0 rejected |
| message:read | PASS | 3 accepted/received, 2 rejected |
| conversation:presence | PASS | 3 accepted/received, 2 rejected |
| socket:error | PASS | 1 accepted/received, 0 rejected |
| room:join | PASS | 4 accepted/received, 3 rejected |
| room:leave | PASS | 1 accepted/received, 0 rejected |
| presence:status | PASS | 8 accepted/received, 0 rejected |
| presence:heartbeat | PASS | 1 accepted/received, 0 rejected |
| typing:start | PASS | 3 accepted/received, 3 rejected |
| typing:stop | PASS | 2 accepted/received, 2 rejected |
| handshake | PASS | 1 accepted/received, 1 rejected |

GraphQL field resolvers also exercised: Yacht.broker, charterRate, destinationIds, viewsCount, likesCount; CrewProfile.displayName; Conversation.unreadCount. Introspection validates the generated schema, all implemented query/mutation names are included, and no Nestar/auth credential fields are published.
