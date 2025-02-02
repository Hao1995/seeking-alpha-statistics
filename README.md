# Seeking Alpha Statistics
In order to assess the credibility of analysts, we are currently retrieving data from the Analysis page as a preliminary step.

## How to use?
* Install Node: `brew install node` (or use `node -v` to check)
* Install package: `npm install`
* Open SeekingAlpha `https://seekingalpha.com` and login with your account.
* Open the Network tab in the developer console.
* Click `Analysis` page and look up the `https://seekingalpha.com/api/v3/articles` XHR.
* Copy the `Cookie` value to as your env - `FETCH_COOKIE` value.
* Run `node main.js`

## Further Todo List
* Retrieve US stocks data
* By analysis the time of analyst's published articles and their buy/sell recommendations, and historical stock prices, we can evaluate their overall performance.