//@ts-check
import { NowPlayingController } from "./NowPlayingController.js";
import { PlaylistExplorerController } from "./PlaylistExplorerController.js";
import { Utility } from "./Utility.js";

export class MusicSourceController {
    cardInterface = null;
    playlists = [];
    offline = false;
    rootDirectoryHandle = null;
    latestTrackUrl = null;

    constructor(cardInterface) {
        this.cardInterface = cardInterface;
    }

    async setOffline(offline) {
        this.offline = offline;
        NowPlayingController.setState("offline", offline);

        if (offline) {
            //CASE: Prepare for offline mode
            if ("socket" in window) {
                //CASE: A socket is already established and is connected
                window.socket.disconnect();
            }

            this.rootDirectoryHandle = await showDirectoryPicker();

            const playlistFileHandle = await (await this.rootDirectoryHandle.getDirectoryHandle("Registries")).getFileHandle("playlists.json");
            const playlistFile = await playlistFileHandle.getFile();
            this.playlists = JSON.parse(await playlistFile.text());

            //Add each playlist's index as field in the playlist
            for (let playlistIndex = 0; playlistIndex < this.playlists.length; playlistIndex++) {
                this.playlists[playlistIndex].index = playlistIndex;
            }

            return true;
        } else {
            //CASE: Prepare for online mode
            if ("socket" in window) {
                //CASE: A socket is already established and is disconnected
                window.socket.connect();
            } else {
                //CASE: No socket established
                //Initialize a new socket with the server
                window.socket = window.io("/musix", { transports: ["websocket"], upgrade: false });

                //Initialize web-socket handlers
                window.socket.on("remote-disable", (params) => {
                    this.cardInterface.getController("playback").setRemotePlay(false);
                });

                window.socket.on("remote-set-volume", (params) => {
                    this.cardInterface.getController("playback").setVolume(params.volume);
                });

                window.socket.on("remote-set-playlist", (params) => {
                    this.cardInterface.getController("playback").setPlaylist(params.playlist);
                });

                window.socket.on("remote-load-track-at", (params) => {
                    this.cardInterface.getController("playback").loadTrackAt(params.trackIndex, params.autoplay);
                });

                window.socket.on("remote-skip-track", (params) => {
                    this.cardInterface.getController("playback").skipTrack(params.direction);
                });

                window.socket.on("remote-seek-to", (params) => {
                    this.cardInterface.getController("playback").seekTo(params.time);
                });

                window.socket.on("remote-set-playback", (params) => {
                    this.cardInterface.getController("playback").setPlayback(params.playback);
                });

                window.socket.on("remote-toggle-play", (params) => {
                    this.cardInterface.getController("playback").togglePlay();
                });
            }

            this.rootDirectoryHandle = null;
            if (this.latestTrackUrl) {
                URL.revokeObjectURL(this.latestTrackUrl);
            }

            //Request playlist database and playlist metadata
            return fetch("/musix/playlists")
                .then(response => response.json())
                .then(response => {
                    if (response.status) {
                        this.playlists = response.data;
                        //Add each playlist's index as field in the playlist
                        for (let playlistIndex = 0; playlistIndex < this.playlists.length; playlistIndex++) {
                            this.playlists[playlistIndex].index = playlistIndex;
                        }
                    } else if (response.serverError === "network") {
                        // this.cardInterface.getController("nowPlaying").view.querySelector("#lyricsDisplay").innerHTML = "Oops! Something's up with the network connection";
                    } else {
                        alert(response.serverError);
                    }
                });
        }
    }

    isOffline() {
        return this.offline;
    }

    toggleSource() {
        if (this.offline) {
            this.setOffline(false);
        } else {
            this.setOffline(true);
        }
    }

    getPlaylists() {
        return this.playlists;
    }

    getPlaylistAt(playlistIndex) {
        return this.playlists[playlistIndex];
    }

    getTrackAt(trackPosition) {
        return this.playlists[trackPosition.playlistIndex].tracks[trackPosition.trackIndex];
    }

    removePlaylistAt(playlistIndex) {
        this.playlists[playlistIndex] = null;
    }

    removeTrackAt(trackPosition) {
        this.playlists[trackPosition.playlistIndex].tracks[trackPosition.trackIndex] = null;

        //Remove the playlist if all tracks are null
        let allTracksRemoved = true;
        for (let i = 0; i < this.playlists[trackPosition.playlistIndex].tracks.length; i++) {
            if (this.playlists[trackPosition.playlistIndex].tracks[i] !== null) {
                allTracksRemoved = false;
                break;
            }
        }

        if (allTracksRemoved) {
            this.removePlaylistAt(trackPosition.playlistIndex);
        }
    }

    async determineTrackUrl(track) {
        if (this.offline) {
            if (this.latestTrackUrl) {
                URL.revokeObjectURL(this.latestTrackUrl);
            }

            const trackPathParts = track.path.split("/");
            const trackFileHandle = await (await this.rootDirectoryHandle.getDirectoryHandle(trackPathParts[0])).getFileHandle(trackPathParts[1]);
            const trackFile = await trackFileHandle.getFile();

            this.latestTrackUrl = URL.createObjectURL(trackFile);
            return this.latestTrackUrl;

        } else {
            return track.path;
        }
    }

    queryRelativePlaylistPosition(relativity) {
        const currentPlaylistIndex = parseInt(localStorage.getItem("currentPlaylistIndex"));

        let possiblePlaylistIndex = -1;

        if (relativity === "next") {
            if (currentPlaylistIndex === this.playlists.length - 1) {
                //CASE: Current playlist is the final playlist
                possiblePlaylistIndex = Utility.findFirstNonNullIndex(this.playlists, true, 0, this.playlists.length - 1);
            } else {
                //CASE: Current playlist is the not the final playlist
                possiblePlaylistIndex = Utility.findFirstNonNullIndex(this.playlists, true, currentPlaylistIndex + 1, this.playlists.length - 1);

                if (possiblePlaylistIndex === -1) {
                    //CASE: Still no playlist is found
                    possiblePlaylistIndex = Utility.findFirstNonNullIndex(this.playlists, true, 0, currentPlaylistIndex);
                }
            }
        } else if (relativity === "previous") {
            if (currentPlaylistIndex === 0) {
                //CASE: Current playlist is the first playlist
                possiblePlaylistIndex = Utility.findFirstNonNullIndex(this.playlists, false, 0, this.playlists.length - 1);
            } else {
                //CASE: Current playlist is not the first playlist
                possiblePlaylistIndex = Utility.findFirstNonNullIndex(this.playlists, false, 0, currentPlaylistIndex - 1);

                if (possiblePlaylistIndex === -1) {
                    //CASE: Still no playlist is found
                    possiblePlaylistIndex = Utility.findFirstNonNullIndex(this.playlists, false, currentPlaylistIndex, this.playlists.length - 1);
                }
            }

        }

        return possiblePlaylistIndex;
    }

    queryRelativeTrackPosition(relativity) {
        const currentPlaylistIndex = parseInt(localStorage.getItem("currentPlaylistIndex"));
        const currentTrackIndex = parseInt(localStorage.getItem("currentTrackIndex"));
        const currentPlaylist = this.playlists[currentPlaylistIndex];

        const possibleTrackPosition = {
            playlistIndex: -1,
            trackIndex: -1
        };

        if (currentPlaylist !== null && relativity === "next") {
            if (currentTrackIndex === currentPlaylist.tracks.length - 1) {
                //CASE: Now playing is the final track
                possibleTrackPosition.playlistIndex = this.queryRelativePlaylistPosition(relativity);
                possibleTrackPosition.trackIndex = Utility.findFirstNonNullIndex(this.playlists[possibleTrackPosition.playlistIndex].tracks, true, 0, this.playlists[possibleTrackPosition.playlistIndex].tracks.length - 1);
            } else {
                //CASE: Now playing is not the final track
                possibleTrackPosition.playlistIndex = currentPlaylistIndex;
                possibleTrackPosition.trackIndex = Utility.findFirstNonNullIndex(this.playlists[possibleTrackPosition.playlistIndex].tracks, true, currentTrackIndex + 1, this.playlists[possibleTrackPosition.playlistIndex].tracks.length - 1);

                if (possibleTrackPosition.trackIndex === null) {
                    //CASE: Still no track is found
                    possibleTrackPosition.playlistIndex = this.queryRelativePlaylistPosition(relativity);
                    possibleTrackPosition.trackIndex = Utility.findFirstNonNullIndex(this.playlists[possibleTrackPosition.playlistIndex].tracks, true, 0, currentTrackIndex);
                }
            }
        } else if (currentPlaylist !== null && relativity === "previous") {
            if (currentTrackIndex === 0) {
                //CASE: Now playing is the first track
                possibleTrackPosition.playlistIndex = this.queryRelativePlaylistPosition(relativity);
                possibleTrackPosition.trackIndex = Utility.findFirstNonNullIndex(this.playlists[possibleTrackPosition.playlistIndex].tracks, false, 0, this.playlists[possibleTrackPosition.playlistIndex].tracks.length - 1);
            } else {
                //CASE: Now playing is not the first track
                possibleTrackPosition.playlistIndex = currentPlaylistIndex;
                possibleTrackPosition.trackIndex = Utility.findFirstNonNullIndex(this.playlists[possibleTrackPosition.playlistIndex].tracks, false, 0, currentTrackIndex - 1);

                if (possibleTrackPosition.trackIndex === null) {
                    //CASE: Still no track is found
                    possibleTrackPosition.playlistIndex = this.queryRelativePlaylistPosition(relativity);
                    possibleTrackPosition.trackIndex = Utility.findFirstNonNullIndex(this.playlists[possibleTrackPosition.playlistIndex].tracks, false, currentTrackIndex, this.playlists[possibleTrackPosition.playlistIndex].tracks.length - 1);
                }
            }
        } else if (currentPlaylist === null) {
            possibleTrackPosition.playlistIndex = this.queryRelativePlaylistPosition(relativity);

            if (relativity === "next") {
                possibleTrackPosition.trackIndex = Utility.findFirstNonNullIndex(this.playlists[possibleTrackPosition.playlistIndex].tracks, true, 0, this.playlists[possibleTrackPosition.playlistIndex].tracks.length - 1);
            } else if (relativity === "previous") {
                possibleTrackPosition.trackIndex = Utility.findFirstNonNullIndex(this.playlists[possibleTrackPosition.playlistIndex].tracks, false, 0, this.playlists[possibleTrackPosition.playlistIndex].tracks.length - 1);
            }
        }

        return possibleTrackPosition;
    }

    appendPlaylist(playlist) {
        const assignedPlaylistIndex = this.playlists.push(playlist) - 1;
        playlist.index = assignedPlaylistIndex;
        //Randomize themeColor
        playlist.themeColor = Utility.getRandColor(100, 255);

        PlaylistExplorerController.appendNewPlaylistView(playlist);

        return assignedPlaylistIndex;
    }

    appendTrackToPlaylist(playlist, track) {
        const assignedTrackIndex = playlist.tracks.push(track) - 1;

        PlaylistExplorerController.appendNewTrackView(playlist, {
            playlistIndex: playlist.index,
            trackIndex: assignedTrackIndex
        });

        return assignedTrackIndex;
    }

    addToQuickPlaylist(track) {
        if (localStorage.getItem("quickPlaylistIndex") === "-1") {
            //CASE: There is no quick playlist created
            //Create the quick playlist in the playlists[]
            const quickPlaylist = MusicSourceController.createNewPlaylist("Quick Playlist", track);
            const quickPlaylistIndex = this.appendPlaylist(quickPlaylist);
            localStorage.setItem("quickPlaylistIndex", quickPlaylistIndex.toString());
            //Ask to begin playback of quickPlaylist
            if (window.frameElement) {
                window.parent.shellInterface.throwAlert("Got a question", "Do you want to start QuickPlaylist now?", "Tap YES if you want to start playback of the QuickPlaylist immediately. Otherwise tap on NO", null, "YES", "NO").then(() => {
                    this.cardInterface.getController("playback").setPlaylist(quickPlaylist);
                    this.cardInterface.getController("playback").loadTrackAt(0, true);
                }, () => {
                    //Do nothing here
                });
            } else {
                if (confirm("Do you want to start playback of QuickPlaylist now?")) {
                    this.cardInterface.getController("playback").setPlaylist(quickPlaylist);
                    this.cardInterface.getController("playback").loadTrackAt(0, true);
                };
            }
        } else {
            //CASE: There is a quick playlist created
            const quickPlaylistIndex = parseInt(localStorage.getItem("quickPlaylistIndex"));
            const quickPlaylist = this.playlists[quickPlaylistIndex];
            //Add the specified track as the last track of the quick playlist
            this.appendTrackToPlaylist(quickPlaylist, track);
        }
    }

    static createNewPlaylist(playlistName, initialTrack) {
        //Initialize a new playlist
        const newPlaylist = {
            name: playlistName,
            themeColor: Utility.getRandColor(100, 255),
            index: null,
            tracks: [

            ]
        };
        newPlaylist.tracks.push(initialTrack);

        return newPlaylist;
    }
}