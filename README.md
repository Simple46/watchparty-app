
# 🎬 WatchParty

> Watch movies and live football with friends in real time.

WatchParty is a full-stack web application that lets users discover movies, create watch party rooms, invite friends using shareable room codes, and interact through real-time chat while watching together.

The platform also includes a live football section, a friends system, and an administrative dashboard for movie and media management.

---

## 🌐 Live Demo

| Service | URL |
|---|---|
| Frontend | https://watchparty-app-omega.vercel.app |
| Backend API | https://watchparty-app-backend.onrender.com |

Create a regular account to explore the user experience.

---

## ✨ Features

### 👤 User Features

- 🎬 Browse a curated movie library
- 🔎 Search movies by title
- 🎭 Filter movies by genre
- ⭐ Sort by rating
- 📅 Sort by release date
- 🔤 Sort alphabetically
- 👀 Sort by most watched
- 🎥 Create watch party rooms
- 🔗 Join rooms using 6-character shareable codes
- 💬 Real-time in-room chat
- ▶️ Real-time playback synchronization for supported video sources
- 👑 Host playback controls
- 🔄 Automatic host transfer when the host disconnects
- 👥 Search for users
- 🤝 Send and accept friend requests
- 👤 Manage friends
- ⚽ Browse live football matches
- 📅 Browse today's and upcoming fixtures
- 📊 View detailed football match information
- ⚽ Create watch parties for supported football matches

### 🛠️ Admin Features

- 📊 Dashboard with platform statistics
- 🎬 Movie management
- 🔎 Search the TMDB catalogue
- ➕ Add movies from TMDB
- ✏️ Edit movie information
- 🗑️ Delete movies and associated media
- 🎥 Upload video files directly to Cloudinary
- 📤 Chunked uploads for large video files
- 📝 Subtitle upload support
- 🚪 View active and inactive rooms
- ☁️ Monitor Cloudinary storage usage

---

# 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, App Router |
| Styling | Tailwind CSS |
| Language | JavaScript |
| Backend | Node.js, Express |
| Real-time Communication | Socket.io |
| Database | PostgreSQL |
| Database Hosting | Supabase |
| ORM | Prisma |
| Authentication | JWT, bcrypt |
| Video Storage | Cloudinary |
| Movie Metadata | TMDB API |
| Football Data | API-Football |
| Football Streams | SportSRC |
| Movie Streaming | VidSrc |
| Frontend Hosting | Vercel |
| Backend Hosting | Render |

---

# 🏛️ Architecture

WatchParty uses a separate frontend and backend architecture.

```text
                         ┌─────────────────────┐
                         │      Next.js        │
                         │      Frontend       │
                         │                     │
                         │ React + Tailwind    │
                         │ Socket.io Client    │
                         └──────────┬──────────┘
                                    │
                          REST API + WebSocket
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │      Express        │
                         │       Backend       │
                         │                     │
                         │ Authentication      │
                         │ Business Logic      │
                         │ Movie Management    │
                         │ Room Management     │
                         │ Football APIs       │
                         │ Admin APIs          │
                         └──────────┬──────────┘
                                    │
                    ┌───────────────┼────────────────┐
                    │               │                │
                    ▼               ▼                ▼
             ┌────────────┐  ┌─────────────┐  ┌─────────────┐
             │ PostgreSQL │  │ Cloudinary  │  │ Third-Party │
             │  Supabase  │  │   Storage   │  │    APIs     │
             └────────────┘  └─────────────┘  └─────────────┘


---

⚡ Real-Time Watch Party

WatchParty uses Socket.io to synchronize events between users inside a room.

Host
 │
 ├── play ────────────────┐
 ├── pause ───────────────┤
 ├── seek ────────────────┤
 │                         ▼
 │                  Socket.io Server
 │                         │
 │              ┌──────────┼──────────┐
 │              ▼          ▼          ▼
 │          Member A    Member B    Member C
 │
 └── Chat messages ───────► All members

The host controls playback for supported video sources, while Socket.io broadcasts the playback state to connected members.

In P2P rooms, any viewer can request play, pause, or seek; the host applies the command so playback stays synchronized. The host can change the movie from the player without leaving the room, and can load `.srt` or `.vtt` subtitles, which are shared with viewers in the room.

P2P player shortcuts: Left/Right seek 10 seconds (Shift + Left/Right seeks 30 seconds), Space toggles playback, Up/Down adjusts volume, `M` mutes, and `F` toggles fullscreen.


---

🎬 Movie Features

Movie metadata is retrieved from TMDB.

Users can browse movies by:

Title

Genre

Rating

Release year

Popularity

Watch count


When a movie is added to the platform, its metadata is stored in PostgreSQL.

For supported external movie embeds, the application stores the relevant embed information rather than hosting the movie file itself.


---

⚽ Football Features

The football section combines multiple third-party services.

API-Football

Used for structured football information including:

Live fixtures

Upcoming fixtures

Match events

Goals

Cards

Substitutions

Lineups

Formations

Match statistics

League standings

Head-to-head history

Venue information

Referee information


SportSRC

Used for supported football stream embed sources.

The application searches for supported streams using the participating teams and fixture information.


---

👥 Friends System

Users can:

Search for other users

Send friend requests

Accept friend requests

Decline requests

Remove friends

View their friends list



---

🧠 Key Engineering Features

🔄 Database Reconnection

The backend uses a safeQuery approach for handling database connection failures.

This is particularly useful when the backend is running on infrastructure that can temporarily suspend inactive services.

The database wrapper:

1. Executes the database operation.


2. Detects connection-related errors.


3. Recreates the Prisma client when necessary.


4. Retries the operation.



This improves reliability after server wake-ups.


---

📤 Chunked Video Upload

Large video files are uploaded to Cloudinary using a chunked upload strategy.

Instead of sending the entire file as a single request, the frontend splits large files into smaller chunks.

Large Video File
       │
       ▼
┌──────┬──────┬──────┬──────┐
│ 6 MB │ 6 MB │ 6 MB │  ... │
└──────┴──────┴──────┴──────┘
       │
       ▼
   Cloudinary
       │
       ▼
Reassembled Video

This improves reliability when uploading large media files from the browser.


---

👑 Automatic Host Transfer

The host of a watch party controls playback.

When the host disconnects:

1. Socket.io detects the disconnect.


2. The server identifies the remaining members.


3. Another active member is promoted.


4. A host_changed event is broadcast.


5. Connected clients update their UI.



This allows the watch party to continue without requiring users to create a new room.


---

⚡ Latency Compensation

Network latency can cause users to receive playback events at slightly different times.

WatchParty compensates for this by taking the estimated network delay into account when applying playback events.

Conceptually:

Adjusted Playback Time
=
Received Playback Time
+
Network Delay

This reduces playback drift between connected users.


---

🔐 Authentication

Authentication is implemented using:

JWT

bcrypt

Protected API routes

Role-based authorization


Authenticated users receive a JWT which is used when accessing protected endpoints.

Administrative endpoints require the appropriate user role.


---

📁 Project Structure

WatchParty/
│
├── backend/
│   ├── controllers/
│   ├── middleware/
│   ├── routes/
│   ├── services/
│   ├── socket/
│   ├── prisma/
│   ├── server.js
│   └── package.json
│
├── frontend/
│   ├── app/
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   ├── services/
│   ├── public/
│   └── package.json
│
├── .gitignore
└── README.md


---

🚀 Getting Started

Prerequisites

Make sure you have:

Node.js 18+

npm or yarn

PostgreSQL / Supabase account

Cloudinary account

TMDB API key

API-Football API key



---

1. Clone the Repository

git clone https://github.com/Simple46/WatchParty.git

cd WatchParty


---

🔧 Backend Setup

2. Navigate to Backend

cd backend

3. Install Dependencies

npm install

4. Configure Environment Variables

Create:

backend/.env

Example:

DATABASE_URL="your_database_url"

JWT_SECRET="your_jwt_secret"

CLOUDINARY_CLOUD_NAME="your_cloud_name"
CLOUDINARY_API_KEY="your_api_key"
CLOUDINARY_API_SECRET="your_api_secret"

TMDB_API_KEY="your_tmdb_api_key"

API_FOOTBALL_KEY="your_api_football_key"

5. Generate Prisma Client

npx prisma generate

6. Run Database Migrations

npx prisma migrate dev

If your project contains a seed script:

npx prisma db seed

7. Start Backend

npm run dev


---

🎨 Frontend Setup

8. Navigate to Frontend

From the project root:

cd frontend

9. Install Dependencies

npm install

10. Configure Environment Variables

Create:

frontend/.env.local

Example:

NEXT_PUBLIC_BACKEND_URL="http://localhost:5000"

11. Start Frontend

npm run dev

Open:

http://localhost:3000


---

🔐 Environment Variables

Backend

DATABASE_URL=
JWT_SECRET=

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

TMDB_API_KEY=
API_FOOTBALL_KEY=

Frontend

NEXT_PUBLIC_BACKEND_URL=

Never commit .env or .env.local files containing real credentials.


---

📡 API Reference

Authentication

Method	Endpoint	Description	Auth

POST	/api/auth/register	Create account	None
POST	/api/auth/login	Login and receive JWT	None



---

Movies

Method	Endpoint	Description	Auth

GET	/api/movies	Get all movies with active room counts	None
GET	/api/movies/:id	Get movie details and active rooms	None



---

Watch Rooms

Method	Endpoint	Description	Auth

POST	/api/rooms/create	Create watch party	User
GET	/api/rooms/:roomCode	Get room details	User
POST	/api/rooms/:roomCode/leave	Leave room	User



---

Admin

Method	Endpoint	Description	Auth

GET	/api/admin/dashboard	Dashboard statistics	Admin
GET	/api/admin/cloudinary-signature	Generate upload credentials	Admin
POST	/api/admin/save-movie	Save movie after upload	Admin
GET	/api/admin/movies	Get all movies	Admin
PUT	/api/admin/movies/:id	Update movie	Admin
DELETE	/api/admin/movies/:id	Delete movie and media	Admin
GET	/api/admin/rooms	Get all rooms	Admin



---

TMDB

Method	Endpoint	Description	Auth

GET	/api/tmdb/search?q=	Search TMDB catalogue	Admin
GET	/api/tmdb/popular	Get popular movies	Admin
POST	/api/tmdb/add	Add movie from TMDB	Admin



---

Friends

Method	Endpoint	Description	Auth

GET	/api/friends	Get friends and pending requests	User
GET	/api/friends/search?q=	Search users	User
POST	/api/friends/request/:userId	Send friend request	User
POST	/api/friends/accept/:requestId	Accept friend request	User
DELETE	/api/friends/:requestId	Remove friend or decline request	User



---

Football

Method	Endpoint	Description	Auth

GET	/api/football/fixtures?type=live	Get live fixtures	User
GET	/api/football/fixtures?type=today	Get today's fixtures	User
GET	/api/football/fixtures?type=upcoming	Get upcoming fixtures	User
GET	/api/football/fixture/:id	Get fixture details	User
GET	/api/football/h2h/:homeId/:awayId	Get head-to-head history	User
GET	/api/football/standings/:leagueId/:season	Get league standings	User
GET	/api/football/stream-search?home=&away=	Find supported stream	User
POST	/api/football/create-room	Create football watch party	User



---

🔌 Socket.io Events

Client → Server

Event	Payload	Description

create_room	{ roomCode, movieId, hostId, user }	Create/open watch room
join_room	{ roomCode, user }	Join existing room
play	{ roomCode, currentTime }	Start playback
pause	{ roomCode, currentTime }	Pause playback
seek	{ roomCode, currentTime }	Change playback position
chat_message	{ roomCode, message }	Send chat message
leave_room	{ roomCode }	Leave room
buffering	{ roomCode }	Notify room about buffering
buffering_done	{ roomCode }	Notify room buffering finished



---

Server → Client

Event	Payload	Description

room_created	{ roomCode, members }	Room created
room_state	{ isPlaying, currentTime, hostId, members }	Current room state
play	{ currentTime, serverTimestamp }	Playback started
pause	{ currentTime }	Playback paused
seek	{ currentTime, serverTimestamp }	Playback position changed
user_joined	{ user, members }	User joined
user_left	{ userId, name, members }	User left
host_changed	{ newHostId, newHostName, members }	Host transferred
chat_message	{ userId, name, message, timestamp }	New chat message
user_buffering	{ userId, name }	User is buffering
user_buffering_done	{ userId, name }	User finished buffering



---

☁️ Deployment

Backend — Render

1. Connect the repository to Render.


2. Create a new Web Service.


3. Set the root directory to backend.


4. Set the build command:



npm install

5. Set the start command:



node server.js

6. Add the required environment variables.


7. Configure the PostgreSQL connection.


8. Deploy.




---

Frontend — Vercel

1. Connect the repository to Vercel.


2. Set the root directory to frontend.


3. Select Next.js as the framework.


4. Add the required environment variables.


5. Deploy.




---

Database — Supabase

For production migrations:

npx prisma migrate deploy

For development:

npx prisma migrate dev

To generate Prisma Client:

npx prisma generate


---

⚠️ Known Limitations

External Video Embeds

Movies played through third-party iframe sources are subject to browser same-origin restrictions.

Because the application does not control cross-origin embedded players, JavaScript cannot reliably control their playback state.

As a result, synchronized play/pause/seek functionality is available only for video sources that the application can directly control.


---

Backend Cold Starts

The backend is deployed on infrastructure where inactive services may be suspended.

After a period of inactivity, the first request can take longer while the server starts.

The database reconnection logic helps recover from stale database connections after inactivity.


---

Third-Party API Limits

TMDB, API-Football, Cloudinary, and other external services have their own usage limits.

Heavy usage may exhaust free-tier quotas or cause temporary feature unavailability.


---

🗺️ Roadmap

Future improvements include:

[ ] Direct messaging

[ ] Group messaging

[ ] Online/offline presence

[ ] Last-seen status

[ ] Typing indicators

[ ] Improved watch-party synchronization

[ ] Watch-party countdown

[ ] Subtitle management

[ ] Push notifications

[ ] Improved room moderation

[ ] Automated testing

[ ] Better monitoring and error reporting



---

🧠 What I Learned

Building WatchParty gave me practical experience with:

Real-Time Systems

Designing event-driven communication and synchronizing state between multiple connected clients using Socket.io.

Distributed State

Handling playback synchronization, latency, reconnection, host transfer, and shared room state.

Database Architecture

Designing relational data models for users, movies, watch rooms, friendships, and other application entities using PostgreSQL and Prisma.

File Uploads

Implementing chunked browser uploads for large media files.

API Integration

Working with multiple external APIs with different authentication methods, response formats, and rate limits.

Deployment

Managing separate frontend and backend deployments, environment variables, database connections, CORS, cold starts, and production configuration.


---

👨🏾‍💻 Author

Hissa Olayiwola

Full-Stack Software Engineer · Nigeria

GitHub: @Simple46

Portfolio: hissa-dev.vercel.app

Email: olayiwolahissa484@gmail.com



---

📄 License

This project is licensed under the MIT License.

See the LICENSE file for details.

**That's the one to copy.** 👆🏾

One thing before you make it public: the README is now clean, but **the code itself is what we'll check next**—especially `.env`, committed secrets, and whether the project structure in the README matches the actual repository. That matters much more than the README when an engineer from Brainers actually opens your code.
