Lastfm = (function () {
    "use strict";

    var BASE_URL = "http://ws.audioscrobbler.com/2.0/";

    function makeAPIRequest(method, options, onload, onerror) {
        if (typeof options === "function") {
            onerror = onload;
            onload = options;
            options = {};
        }

        options.api_key = Config.constants.lastfm_api_key;
        options.lang = getCurrentLocale();
        options.method = method;

        loadResource(BASE_URL, {
            responseType: "xml",
            data: options,
            onload: function (xml) {
                if (!xml || xml.documentElement.getAttribute("status") === "failed")
                    return onerror();

                onload(xml);
            },
            onerror: onerror
        }, this);
    }

    return {
        getArtistInfo: function Lastfm_getInfo(searchQuery, callback) {
            searchQuery = searchQuery.split(" ").map(function (part) {
                return part.charAt(0).toUpperCase() + part.substr(1).toLowerCase();
            }).join(" ");

            parallel({
                info: function (callback) {
                    makeAPIRequest("artist.getinfo", {artist: searchQuery}, function (xml) {
                        callback(xml.querySelector("bio > summary").textContent);
                    }, function () {
                        callback(null);
                    });
                },
                similar: function (callback) {
                    // @todo similar есть и в просто artist.getInfo
                    makeAPIRequest("artist.getSimilar", {
                        artist: searchQuery,
                        limit: 10,
                        autocorrect: 1
                    }, function (xml) {
                        var artists = [];
                        [].forEach.call(xml.querySelectorAll("artist > name"), function (artistName) {
                            artists.push(artistName.textContent);
                        });

                        callback(artists);
                    }, function () {
                        callback(null);
                    });
                },
                tracks: function (callback) {
                    makeAPIRequest("artist.gettoptracks", {artist: searchQuery}, function (xml) {
                        var tracks = [];

                        [].forEach.call(xml.querySelectorAll("toptracks > track"), function (track) {
                            tracks.push(track.querySelector("name").textContent);
                        });

                        callback(tracks);
                    }, function () {
                        callback([]);
                    });
                },
                albums: function (callback) {
                    makeAPIRequest("artist.gettopalbums", {artist: searchQuery}, function (xml) {
                        var albums = [];

                        [].forEach.call(xml.querySelectorAll("topalbums > album"), function (album) {
                            var image = (album.querySelector("image[size='large']") || album.querySelector("image[size='medium']") || album.querySelector("image[size='small']"));

                            albums.push({
                                title: album.querySelector("name").textContent,
                                cover: image ? image.textContent : "",
                                mbid: album.querySelector("mbid").textContent
                            });
                        });

                        callback(albums);
                    }, function () {
                        callback([]);
                    });
                }
            }, callback);
        },

        getAlbumInfo: function Lastfm_getAlbumInfo(searchData, callback) {
            makeAPIRequest("album.getinfo", searchData, function (xml) {
                var cover = (xml.querySelector("album > image[size='large']") || xml.querySelector("album > image[size='medium']") || xml.querySelector("album > image[size='small']"));
                var shortDescriptionNode = xml.querySelector("album > wiki > summary");
                var fullDescriptionNode = xml.querySelector("album > wiki > content");

                var output = {
                    artist: xml.querySelector("album > artist").textContent,
                    title: xml.querySelector("album > name").textContent,
                    albumDescription: shortDescriptionNode ? shortDescriptionNode.textContent : "",
                    fullDescription: fullDescriptionNode ? fullDescriptionNode.textContent : "",
                    cover: cover ? cover.textContent : "",
                    songs: []
                };

                [].forEach.call(xml.querySelectorAll("album > tracks > track"), function (track) {
                    output.songs.push({
                        number: track.getAttribute("rank"),
                        title: track.querySelector("name").textContent,
                        duration: track.querySelector("duration").textContent
                    });
                });

                callback(output);
            }, function () {
                callback(null);
            });
        }
    };
})();
