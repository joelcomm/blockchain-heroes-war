# Blockchain Heroes WAR

## Overview
A WAR-style card game using NFT cards from the WAX blockchain. Built as a single-file React app using Babel standalone for in-browser JSX transformation.

## Tech Stack
- React 18 via CDN (UMD builds)
- Babel standalone for JSX
- Tailwind CSS via CDN
- WAX Cloud Wallet (WCW) via local waxjs.js file
- Deployed to GitHub Pages at https://joelcomm.github.io/blockchain-heroes-war/

## Key Files
- index.html — The entire game (single self-contained HTML file with inline React/Babel)
- waxjs.js — WAX Cloud Wallet browser bundle (downloaded from GitHub, 360KB)
- .nojekyll — Tells GitHub Pages not to use Jekyll

## Architecture Notes
- WaxJS requires a bridge script pattern: a regular script tag captures waxjs.WaxJS into window.__WaxJSClass BEFORE Babel processes the JSX scripts
- Cards fetched from AtomicAssets API: https://aa.wax.blacklusion.io for collection officialhero, schema series1
- Card images on IPFS via https://ipfs.io/ipfs/ gateway
- Card strength = base rarity value (common=1 through legendary=5) + hero power bonus
- WAR mechanic: ties trigger WAR (2 face-down, 1 face-up decides). Tie pile accumulates across consecutive ties
- Deck building: 50-card deck with rarity caps (legendary:4, epic:8, rare:10, uncommon:12, common:16)
- Tabs: Collection & Deck (first), Battle (second). Power Registry tab code exists but is hidden.

## Current State
- Game is playable and deployed to GitHub Pages
- WAX Cloud Wallet connection works
- Card images display in battle (full card left, stats right)
- Next feature to implement: Hero abilities system

## Hero Abilities System (Next Feature)
- 20 abilities total, 4 per rarity tier
- Common: underdog/utility abilities
- Uncommon: utility abilities
- Rare: disruption abilities
- Epic: high-impact abilities
- Legendary: game-warping abilities
- Deterministic assignment via templateId hash
- Named hero overrides preserved
- Battle engine needs: context object, streak tracking, round logs
- UI needs: ability display on cards, trigger feedback after rounds

## Commands
- Test locally: python3 -m http.server 8000 then open http://localhost:8000
- Deploy: push changes to main branch on GitHub, Pages auto-deploys
