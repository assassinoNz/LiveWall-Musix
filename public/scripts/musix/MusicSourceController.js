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
            //Remove socket
            window.socket = null;

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
            
            this.rootDirectoryHandle = null;
            if (this.latestTrackUrl) {
                URL.revokeObjectURL(this.latestTrackUrl);
            }

            //Initialize web-socket handlers
            window.socket = window.socketIo("/musix", { transports: ["websocket"], upgrade: false });
            //NOTE: This must be done only in online mode
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

            window.socket.on("remote-seek-to", (params) => {
                this.cardInterface.getController("playback").seekTo(params.time);
            });

            window.socket.on("remote-toggle-play", (params) => {
                this.cardInterface.getController("playback").togglePlay();
            });

            window.socket.on("remote-skip-track", (params) => {
                this.cardInterface.getController("playback").skipTrack(params.direction);
            });

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
        if (relativity === "next") {
            const isFinalPlaylist = currentPlaylistIndex === this.playlists.length - 1;
            if (isFinalPlaylist) {
                return {
                    playlistIndex: 0
                };
            } else {
                return {
                    playlistIndex: currentPlaylistIndex + 1
                };
            }
        } else if (relativity === "previous") {
            const isFirstPlaylist = currentPlaylistIndex === 0;
            if (isFirstPlaylist) {
                return {
                    playlistIndex: this.playlists.length - 1
                };
            } else {
                return {
                    playlistIndex: currentPlaylistIndex - 1
                };
            }
        }
    }

    queryRelativeTrackPosition(relativity) {
        const currentPlaylistIndex = parseInt(localStorage.getItem("currentPlaylistIndex"));
        const currentTrackIndex = parseInt(localStorage.getItem("currentTrackIndex"));
        const currentPlaylist = this.playlists[currentPlaylistIndex];
        if (relativity === "next") {
            const isFinalPlaylist = currentPlaylistIndex === this.playlists.length - 1;
            const isFinalTrack = currentTrackIndex === currentPlaylist.tracks.length - 1;
            if (isFinalPlaylist && isFinalTrack) {
                //CASE: Now playing is the final track of the final playlist
                //Return position of first track of the first playlist
                return {
                    playlistIndex: 0,
                    trackIndex: 0
                };
            } else if (isFinalTrack) {
                //CASE: Now playing is the final track of the current playlist
                //Return position of first track of the next playlist
                return {
                    playlistIndex: currentPlaylistIndex + 1,
                    trackIndex: 0
                };
            } else {
                //CASE: Now playing is not a final track or the final the playlist
                //Return position of next track of the current playlist
                return {
                    playlistIndex: currentPlaylistIndex,
                    trackIndex: currentTrackIndex + 1
                };
            }
        } else if (relativity === "previous") {
            const isFirstPlaylist = currentPlaylistIndex === 0;
            const isFirstTrack = currentTrackIndex === 0;
            if (isFirstPlaylist && isFirstTrack) {
                //CASE: Now playing is the first track of the first playlist
                //Return position of final track of the final playlist
                return {
                    playlistIndex: this.playlists.length - 1,
                    trackIndex: this.playlists[this.playlists.length - 1].tracks.length - 1
                };
            } else if (isFirstTrack) {
                //CASE: Now playing is the first track of the current playlist
                //Return position of final track of the previous playlist
                return {
                    playlistIndex: currentPlaylistIndex - 1,
                    trackIndex: this.playlists[currentPlaylistIndex - 1].tracks.length - 1
                };
            } else {
                //CASE: Now playing is not a first track or the first the playlist
                //REturn position of previous track of the current playlist
                return {
                    playlistIndex: currentPlaylistIndex,
                    trackIndex: currentTrackIndex - 1
                };
            }
        }
    }

    appendPlaylist(playlist) {
        const assignedPlaylistIndex = this.playlists.push(playlist) - 1;
        playlist.index = assignedPlaylistIndex;
        //Randomize themeColor
        playlist.themeColor = Utility.getRandColor();

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
            themeColor: Utility.getRandColor(),
            index: null,
            tracks: [

            ]
        };
        newPlaylist.tracks.push(initialTrack);

        return newPlaylist;
    }
}