# Luckie Runner!

This is a simple JavaScript runner game, based off an idea I had in 2019. I was going through some tough times then, so I wasn't able to finish the project. Now, I am striving to create the game I envisioned so long ago with my recent programming experience. Let's see how this goes!

## What is Luckie Runner

In Luckie Runner, you play as Luckie Puppy, a barista dog who is running late to her shift at Beachside Boba Cafe! Can she make it in time? Or will RNG screw her over? Find out by playing the game!

## Core Objectives

For this project, I would like to implement everything I had in my old game, including:

- Platforms
- Scrolling background
- Music/SFX
- Enemy Sprites
- Coin pickups
- Custom sprite art
- Jump/Run animations

## Stretch Goals

What fun would a project be without stretch goals? These are things I didn't get to put in my OG Luckie Runner, but I would love to implement here!

Here they are:

- Enemy attacks (i.e. magic, poison)
- Traps/spikes/lava
- Levels to get through
- Shop at the end of a level (to encourage you to defeat enemies)
- Different biomes/levels/platform types
- Coin collection stats
- Health bar
- High score board
- UI/UX (pause, play)
- Start menu
- Enter password to get to level functionality (a la Chip's Challenge)
- Shop screen
- Game over screen
- Volume/SFX controls
- Cutscenes (with animated sequences or talkboxes of the characters)

## Getting Started

### Prerequisites

Before you can run Luckie Runner, make sure you have the following installed on your system:

- **Node.js** (version 14 or higher) - [Download from nodejs.org](https://nodejs.org/)
- **npm** (comes with Node.js)
- A modern web browser (Chrome, Firefox, Safari, or Edge)

### Installation

1. **Clone or download this repository:**

   ```bash
   git clone https://github.com/mso-docs/Luckie-Runner.git
   cd Luckie-Runner
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

### Running the Game

1. **Start the game server:**

   ```bash
   npm start
   ```
   
   Or for development with auto-restart:

   ```bash
   npm run dev
   ```

2. **Open your browser and navigate to:**

   ```url
   http://localhost:3000
   ```

3. **Start playing!** Help Luckie Puppy get to her shift at Beachside Boba Cafe on time!

### Game Controls

- **Space** or **Up Arrow** - Jump
- **Left Arrow** - Move left
- **Right Arrow** - Move right

### Troubleshooting

- **Port already in use:** If you see an error about port 3000 being in use, either:
  - Stop any other applications using port 3000
  - Or modify the PORT in `server.js` to use a different port
- **Node.js not found:** Make sure Node.js is properly installed and added to your system PATH
- **Game not loading:** Check the browser console (F12) for any error messages

## Languages Used

For this project, I primarily used:

- HTML
- CSS
- JavaScript

## Original Inspiration

I was inspired to start this project by following a tutorial from Coding Ninjas. They have a website tutorial on how to set up a simple runner game. I followed the tutorial, but added a lot of custom code/art to it, which eventually expanded into this project. You can find the original tutorial [here](https://www.sourcecodester.com/javascript/15463/ninja-endless-runner-game-javascript-free-source-code.html). 

## Project Requirements

Have an architecture where I can have classes that contain modular code for all of my entities in the game. Put all files within this directory: [C:\Code\luckie-runner\game](C:\Code\luckie-runner\game).

Create a server to bring up the local host.

