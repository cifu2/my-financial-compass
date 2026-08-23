name: Deploy to Vercel (production)

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    permissions:
      contents: read
    env:
      VERCEL_ORG_ID: team_EVTEUDmv7ZCk4Aas3NA5EjTF
      VERCEL_PROJECT_ID: prj_srkaWNp8lTPVizoiQGzZxWxE74rr
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Install Vercel CLI
        run: npm install --global vercel@latest

      - name: Pull Vercel environment information
        run: vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}

      - name: Build project
        run: vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}

      - name: Deploy project
        run: vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}