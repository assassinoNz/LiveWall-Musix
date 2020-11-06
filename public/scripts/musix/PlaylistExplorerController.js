//@ts-check
export class PlaylistExplorerController {
    cardInterface = null;

    view = null;
    playlistViewTemplate = null;
    trackViewTemplate = null;
    trackContextPanel = document.getElementById("trackContextPanel");

    constructor(cardInterface, panelView) {
        this.cardInterface = cardInterface;

        this.view = panelView;
        this.playlistViewTemplate = this.cardInterface.getTemplate("#playlistViewTemplate");
        this.trackViewTemplate = this.cardInterface.getTemplate(".panelDivisionSectorItem");

        const playlists = this.cardInterface.getController("playlists").getPlaylists();
        //Load playlistExplorer
        //NOTE: A DocumentFragment is used to improve performance
        const playlistViewsFragment = new DocumentFragment();
        for (let playlistIndex = 0; playlistIndex < playlists.length; playlistIndex++) {
            const playlistView = this.createPlaylistView(playlists[playlistIndex]);

            playlistViewsFragment.appendChild(playlistView);
        }
        this.view.children[0].appendChild(playlistViewsFragment);

        // this.view.querySelector("button").addEventListener("click", () => {
        //     const directoryPath = prompt("Specify an absolute directory path for your playlist");
        //     if (directoryPath) {
        //         //Fetch a playlist for the directoryPath
        //         fetch(`/musix/playlists?directoryPath=${directoryPath}`, {
        //             method: "PUT",
        //             headers: {
        //                 "Content-Type": "application/json"
        //             }
        //         })
        //             .then(response => response.json())
        //             .then(response => {
        //                 if (response.status) {
        //                     this.cardInterface.getController("playlists").appendPlaylist(response.data);
        //                 } else {
        //                     alert(response.serverError.message);
        //                 }
        //             });
        //     }
        // });
    }

    getView() {
        return this.view;
    }

    appendNewPlaylistView(playlist) {
        const playlistView = this.createPlaylistView(playlist);
        this.view.firstElementChild.appendChild(playlistView);
    }

    appendNewTrackView(playlist, trackPosition) {
        //NOTE: Playlist's index matches its playlistView index inside playlistViewController
        const playlistView = this.view.firstElementChild.children[playlist.index];
        const trackView = this.createTrackView(trackPosition);
        playlistView.appendChild(trackView);
    }

    createPlaylistView(playlist) {
        const playlistView = this.playlistViewTemplate.cloneNode(true);
        playlistView.firstElementChild.firstElementChild.textContent = playlist.name;
        playlistView.firstElementChild.firstElementChild.style.color = playlist.themeColor;
        playlistView.firstElementChild.firstElementChild.addEventListener("click", () => {
            playlistView.children[1].classList.toggle("inactive");
        });

        playlistView.firstElementChild.firstElementChild.addEventListener("contextmenu", (event) => {
            event.preventDefault();
            this.cardInterface.getController("context").setupPlaylistContext(playlist.name, playlist.index);
            this.cardInterface.getController("context").show();
        });

        for (let trackIndex = 0; trackIndex < playlist.tracks.length; trackIndex++) {
            const trackView = this.createTrackView({ playlistIndex: playlist.index, trackIndex: trackIndex });
            playlistView.children[1].appendChild(trackView);
        }

        return playlistView;
    }

    createTrackView(trackPosition) {
        const playlists = this.cardInterface.getController("playlists").getPlaylists();
        const trackView = this.trackViewTemplate.cloneNode(true);
        if (playlists[trackPosition.playlistIndex].tracks[trackPosition.trackIndex].title) {
            trackView.textContent = playlists[trackPosition.playlistIndex].tracks[trackPosition.trackIndex].title;
        } else {
            const track = playlists[trackPosition.playlistIndex].tracks[trackPosition.trackIndex];
            trackView.textContent = track.path.slice(track.path.lastIndexOf("/") + 1, track.path.lastIndexOf("."))
        }
        trackView.dataset.playlistIndex = trackPosition.playlistIndex.toString();
        trackView.dataset.trackIndex = trackPosition.trackIndex.toString();

        trackView.addEventListener("click", (event) => {
            this.cardInterface.getController("nowPlaying").setPlaylist(this.cardInterface.getController("playlists").getPlaylistAt(trackPosition.playlistIndex))
            this.cardInterface.getController("nowPlaying").loadTrackAt(trackPosition.trackIndex);
            this.cardInterface.getController("nowPlaying").togglePlay();
        });

        trackView.addEventListener("contextmenu", (event) => {
            event.preventDefault();

            let titleTextContent = "";
            if (playlists[trackPosition.playlistIndex].tracks[trackPosition.trackIndex].title) {
                titleTextContent = playlists[trackPosition.playlistIndex].name + " . " + playlists[trackPosition.playlistIndex].tracks[trackPosition.trackIndex].title;
            } else {
                const track = playlists[trackPosition.playlistIndex].tracks[trackPosition.trackIndex];
                titleTextContent = playlists[trackPosition.playlistIndex].name + " . " + track.path.slice(track.path.lastIndexOf("/") + 1, track.path.lastIndexOf("."))
            }

            this.cardInterface.getController("context").setupTrackContext(titleTextContent, trackPosition);
            this.cardInterface.getController("context").show();
        });

        return trackView;
    }

    search(keyword) {
        keyword = keyword.toLowerCase();
        let found = false;

        const panelDivisionSectorItems = document.getElementsByClassName("panelDivisionSectorItem");
        for (let i = 0; i < panelDivisionSectorItems.length; i++) {
            if (panelDivisionSectorItems[i].textContent.toLowerCase().includes(keyword)) {
                panelDivisionSectorItems[i].scrollIntoView();
                this.cardInterface.getController("nowPlaying").setPlaylist(this.cardInterface.getController("playlists").getPlaylistAt(parseInt(panelDivisionSectorItems[i].dataset.playlistIndex)));
                this.cardInterface.getController("nowPlaying").loadTrackAt(parseInt(panelDivisionSectorItems[i].dataset.trackIndex));
                found = true;
                break;
            }
        }

        if (!found) {
            if (window.frameElement) {
                window.parent.shellInterface.throwAlert("Oops! We found nothing", "Try words instead of phrases", "We couldn't find a track matching your keyword. Try again with a different keyword", null, "OK", null);
            } else {
                alert("We couldn't find a track matching your keyword. Try again with a different keyword");
            }
        }
    }
}