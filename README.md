# Folgur
# v0.0.1: Pre-Alpha

## By Nifty255

This software is provided "as-is" with no warranties.

Presented the GPLv3 license.

Creation and/or publication of media (images, videos, etc.) while using this software is authorized.

This software is in Pre-Alpha condition. Bugs will happen. If you have a bug, or a suggestion, please leave it in a mature manner.


# FEATURES:

Folgur is a Node.js-based web server with client pages. It was designed to be an independent site which integrates with for Imgur users who wish to sort their favorites into folders. The project became unnecessary as of 11 Oct 2017, when Imgur entered beta testing of its own favorites folders feature. This code is made public for posterity.

- Easy to use web-based interface.
- Stores your favorites into folders, just like images in Windows.
- Add any unsorted images into new or existing folders.
- Easily navigate your favorites folders and copy links to your favorites.

Folgur requires authorization to your Imgur account in order to access your favorites. Those who wish to support Folgur maybe become Nifty255's Patron. Supporters gain more folder and image capacity. Once benefits are applied, they are permanent.

# ENVIRONMENT VARS:

- IM-CLIENT: The Imgur app client ID.
- IM-SECRET: The Imgur app client secret.
- MASHAPEKEY: Not currently used, the Mashape key, for commercial use if Imgur's API.
- ISHEROKU: Determines whether the app is running on Heroku. Used to obtain the proper MongoDB URI. Set to "1" without quotes.
- MONGOURI: When ISHEROKU is set to "1", Mongoose connects to this URI.

# CHANGELOG:

***
## 0.0:

#### v0.0.1:
- PRE-ALPHA