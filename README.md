## **HUMMINGBIRD**
Hummingbird is a browser extension for *Twitter/X* that scrapes post user information from tweets that appear on a user's 'For You' timeline. It uses a user's active *csrf-token* to make fetch requests to the X API. This information then gets logged in a PostgreSQL database managed by an external server corresponding to the "api_url" in *config.js*, which in this release has been replaced with a generic localhost url.

In order to begin processing this information, a user must provide their extension with a valid *invite code* recognized by the external server. The server will then consume the invite and supply the extension with an *api key* which will validate traffic from the user. The *api key* will also have a corresponding *observer id* server-side, to correlate specific post exposures with specific users while alalowing them to remain anonymous.

