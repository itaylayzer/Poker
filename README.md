# Poker IO

play: https://itaylayzer.github.io/Poker/

inspired by google sollitare (credits inside)

## How to run the project

theres `src/config.ts` file that is hidden (inside .gitignore file), that his structure is:

```ts
export default {
	CODE_PREFIX: <string> // required,
	PEER_SERVER_HOST: <string?>, // optional
	PEER_SERVER_PORT: <number?>, // optional, default 443
	PEER_SECURE: <boolean?>, // optional, default false
	PEER_DEBUG_LEVEL: <number?>, // optional, default 0
};
```

NOTICE: theres react router, but the build will not create 404.html. thats because its unique pages are for development eyes only.

## Credits:

without those assets the game wasn't exists

1. Model Credits:

-   [Donald Model](https://sketchfab.com/3d-models/base-mesh-low-poly-character-84cd6685487949bca626bcfc244d) - @YOPN 2e12

2. Texture Credits:

-   [Poker Textures](https://www.spriters-resource.com/browser_games/googlesolitaire/sheet/147613/) - @Google & @DogToon64

## Dependencies:

-   Three.js
-   Peer.js
-   React.js

## ToDo List:

-   Splitting Money Mechanizm
-   Effects
-   Mii
-   Voice Call
-   Game & Custom Modes
