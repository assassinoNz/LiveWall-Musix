//@ts-check
import { NowPlayingController } from "./NowPlayingController.js";
import { PlaylistExplorerController } from "./PlaylistExplorerController.js";
import { Utility } from "./Utility.js";

export class MusicSourceController {
    cardInterface = null;
    playlists = [];
    quickPlaylistIndex = null;
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

                window.socket.on("remote-load-track", (params) => {
                    this.cardInterface.getController("playback").loadTrack(params.trackPosition, params.autoplay);
                });

                window.socket.on("remote-toggle-play", (params) => {
                    this.cardInterface.getController("playback").togglePlay();
                });

                window.socket.on("remote-skip-track", (params) => {
                    this.cardInterface.getController("playback").skipTrack(params.direction);
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

    getQuickPlaylistIndex() {
        return this.quickPlaylistIndex;
    }

    addPlaylistAt(playlistIndex, playlist, updateUI) {
        this.playlists.splice(playlistIndex, 0, playlist);

        const currentTrackPosition = this.cardInterface.getController("playback").getCurrentTrackPosition();
        if (playlistIndex <= currentTrackPosition.playlistIndex) {
            //CASE: Added playlist was in the same position as currentPlaylistIndex or a position before it
            //Increase the currentPlaylistIndex
            currentTrackPosition.playlistIndex += 1;
        }

        if (playlistIndex <= this.quickPlaylistIndex) {
            //CASE: Added playlist was in the same position as quickPlaylistIndex or a position before it
            //Increase the quickPlaylistIndex
            this.quickPlaylistIndex += 1;
        }

        if (updateUI) {
            //Update UI
            PlaylistExplorerController.addMissingPlaylistViewForPlaylistAt(playlistIndex);
        }
    }

    addTrackAt(trackPosition, track, updateUI) {
        this.playlists[trackPosition.playlistIndex].tracks.splice(trackPosition.trackIndex, 0, track);

        const currentTrackPosition = this.cardInterface.getController("playback").getCurrentTrackPosition();
        if (trackPosition.playlistIndex === currentTrackPosition.playlistIndex && trackPosition.trackIndex <= currentTrackPosition.trackIndex) {
            //CASE: Added track and the currentTrack was in the same playlist and added track was added to currentTrackPosition or a position before it
            //Increase the currentTrackIndex
            currentTrackPosition.trackIndex += 1;
        }

        if (updateUI) {
            //Update UI
            PlaylistExplorerController.addMissingTrackViewForTrackAt(trackPosition);
        }
    }

    removePlaylistAt(playlistIndex, updateUI) {
        const removedPlaylist = this.playlists.splice(playlistIndex, 1);

        const currentTrackPosition = this.cardInterface.getController("playback").getCurrentTrackPosition();
        if (playlistIndex === currentTrackPosition.playlistIndex) {
            //CASE: Removed playlist was the playlist at currentPlaylistIndex
            //Try to load the first track of the new playlist at currentPlaylistIndex
            if (this.playlists[currentTrackPosition.playlistIndex]) {
                //CASE: There is a new playlist at the currentPlaylistIndex/Removed playlist was the currentPlaylist but wasn't the last playlist
                //Load the first track of the new playlist at the currentPlaylistIndex
                this.cardInterface.getController("playback").loadTrack({ playlistIndex: currentTrackPosition.playlistIndex, trackIndex: 0 }, false);
            } else {
                //CASE: There is no playlist at the currentPlaylistIndex/Removed playlist was the currentPlaylist and also was the last playlist
                //Load the first track of the first playlist
                this.cardInterface.getController("playback").loadTrack({ playlistIndex: 0, trackIndex: 0 }, false);
            }
        } else if (playlistIndex < currentTrackPosition.playlistIndex) {
            //CASE: Removed playlist was situated before the currentPlaylist
            //Decrease the currentPlaylistIndex by 1
            currentTrackPosition.playlistIndex -= 1;
        }

        if (playlistIndex === this.quickPlaylistIndex) {
            //CASE: Removed playlist was the quickPlaylist
            this.quickPlaylistIndex = null;
        } else if (playlistIndex < this.quickPlaylistIndex) {
            //CASE: Removed playlist was situated before the quickPlaylist
            this.quickPlaylistIndex -= 1;
        }

        if (updateUI) {
            //Update UI
            PlaylistExplorerController.removePlaylistViewAt(playlistIndex);
        }

        return removedPlaylist;
    }

    removeTrackAt(trackPosition, updateUI) {
        const removedTrack = this.playlists[trackPosition.playlistIndex].tracks.splice(trackPosition.trackIndex, 1)[0];

        const currentTrackPosition = this.cardInterface.getController("playback").getCurrentTrackPosition();
        if (trackPosition.playlistIndex === currentTrackPosition.playlistIndex) {
            //CASE: Removed track and the currentTrack was in the same playlist
            if (trackPosition.trackIndex === currentTrackPosition.trackIndex) {
                //CASE: Removed track was the track at currentTrackIndex
                //Try to load the new track at currentTrackPosition
                if (this.playlists[currentTrackPosition.playlistIndex].tracks[currentTrackPosition.trackIndex]) {
                    //CASE: There is a new track at the currentTrackPosition/Removed track was in the currentPlaylist but not its last track
                    //Load the new track at currentTrackPosition
                    this.cardInterface.getController("playback").loadTrack(currentTrackPosition, false);
                } else {
                    //CASE: There is track at the currentTrackPosition/Removed playlist was in the currentPlaylist and also was its last track
                    //Load the first track of the next playlist
                    //NOTE: We have to query the next playlist
                    this.cardInterface.getController("playback").loadTrack({ playlistIndex: this.queryRelativePlaylistPosition(currentTrackPosition.playlistIndex, "next"), trackIndex: 0 }, false);
                }
            } else if (trackPosition.trackIndex < currentTrackPosition.trackIndex) {
                //CASE: Removed track was situated before the track at currentTrackPosition
                //Decrease the currentTrackIndex by 1
                currentTrackPosition.trackIndex -= 1;
            }
        }

        if (updateUI) {
            //Update UI
            PlaylistExplorerController.removeTrackViewAt(trackPosition);
        }

        //Remove the playlist if all tracks are removed
        if (this.playlists[trackPosition.playlistIndex].tracks.length === 0) {
            this.removePlaylistAt(trackPosition.playlistIndex, true);
        }

        return removedTrack;
    }

    async determineTrackUrl(trackPosition) {
        if (this.offline) {
            if (this.latestTrackUrl) {
                URL.revokeObjectURL(this.latestTrackUrl);
            }

            const trackPathParts = this.playlists[trackPosition.playlistIndex].tracks[trackPosition.trackIndex].path.split("/");
            const trackFileHandle = await (await this.rootDirectoryHandle.getDirectoryHandle(trackPathParts[0])).getFileHandle(trackPathParts[1]);
            const trackFile = await trackFileHandle.getFile();

            this.latestTrackUrl = URL.createObjectURL(trackFile);
            return this.latestTrackUrl;

        } else {
            return this.playlists[trackPosition.playlistIndex].tracks[trackPosition.trackIndex].path;
        }
    }

    queryRelativePlaylistPosition(playlistIndex, relativity) {
        if (relativity === "next") {
            if (playlistIndex === this.playlists.length - 1) {
                //CASE: Current playlist is the last playlist
                return 0;
            } else {
                //CASE: Current playlist is not the last playlist
                return playlistIndex + 1;
            }
        } else if (relativity === "previous") {
            if (playlistIndex === 0) {
                //CASE: Current playlist is the first playlist
                return this.playlists.length - 1;
            } else {
                //CASE: Current playlist is not the first playlist
                return playlistIndex - 1;
            }
        }
    }

    queryRelativeTrackPosition(trackPosition, relativity) {
        const currentPlaylist = this.playlists[trackPosition.playlistIndex];

        const upcomingTrackPosition = {
            playlistIndex: -1,
            trackIndex: -1
        };

        if (relativity === "next") {
            if (trackPosition.trackIndex === currentPlaylist.tracks.length - 1) {
                //CASE: Now playing is the final track;
                upcomingTrackPosition.playlistIndex = this.queryRelativePlaylistPosition(trackPosition.playlistIndex, relativity);
                upcomingTrackPosition.trackIndex = 0;
            } else {
                //CASE: Now playing is not the final track
                upcomingTrackPosition.playlistIndex = trackPosition.playlistIndex;
                upcomingTrackPosition.trackIndex = trackPosition.trackIndex + 1;
            }
        } else if (relativity === "previous") {
            if (trackPosition.trackIndex === 0) {
                //CASE: Now playing is the first track
                upcomingTrackPosition.playlistIndex = this.queryRelativePlaylistPosition(trackPosition.playlistIndex, relativity);
                upcomingTrackPosition.trackIndex = this.playlists[upcomingTrackPosition.playlistIndex].tracks.length - 1;
            } else {
                //CASE: Now playing is not the first track
                upcomingTrackPosition.playlistIndex = trackPosition.playlistIndex;
                upcomingTrackPosition.trackIndex = trackPosition.trackIndex - 1;
            }
        }

        return upcomingTrackPosition;
    }

    addToQuickPlaylist(track) {
        if (this.quickPlaylistIndex) {
            //CASE: There is a quick playlist created
            //Add the specified track as the last track of the quick playlist
            this.addTrackAt({playlistIndex: this.quickPlaylistIndex, trackIndex: this.playlists[this.quickPlaylistIndex].tracks.length}, track, true);
        } else {
            //CASE: There is no quick playlist created
            //Create the quick playlist in the playlists[]
            const quickPlaylist = {
                name: "Jump Playlist",
                themeColor: Utility.getRandColor(100, 255),
                tracks: [
                    track
                ]
            };
            this.addPlaylistAt(this.playlists.length, quickPlaylist, true);
            this.quickPlaylistIndex = this.playlists.length - 1;
        }
    }

    exportPlaylists() {
        if (this.quickPlaylistIndex) {
            //CASE: There is a quick playlist created
            //Remove it
            this.removePlaylistAt(this.quickPlaylistIndex, true);
        }

        return fetch("/musix/playlists", {
            method: "PATCH",
            headers: {
                "Content-Type": "text/plain"
            },
            body: JSON.stringify(this.playlists, null, "    ")
        })
            .then(response => response.json())
            .then(response => {
                return response.status;
            });
    }
}