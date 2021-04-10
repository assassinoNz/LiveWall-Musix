//@ts-check
import { ContextController } from "./ContextController.js";

export class PlaylistExplorerController {
    static cardInterface = null;

    static view = null;
    static playlistViewTemplate = null;
    static trackViewTemplate = null;
    static trackContextPanel = document.getElementById("trackContextPanel");

    static init(cardInterface, panelView) {
        PlaylistExplorerController.cardInterface = cardInterface;

        PlaylistExplorerController.view = panelView;
        PlaylistExplorerController.playlistViewTemplate = PlaylistExplorerController.cardInterface.getTemplate("#playlistViewTemplate");
        PlaylistExplorerController.trackViewTemplate = PlaylistExplorerController.cardInterface.getTemplate(".panelDivisionSectorItem");

        const playlists = PlaylistExplorerController.cardInterface.getController("musicSource").getPlaylists();
        //Load playlistExplorer
        //NOTE: A DocumentFragment is used to improve performance
        const playlistViewsFragment = new DocumentFragment();
        for (let playlistIndex = 0; playlistIndex < playlists.length; playlistIndex++) {
            const playlistView = PlaylistExplorerController.createPlaylistView(playlists[playlistIndex]);

            playlistViewsFragment.appendChild(playlistView);
        }
        PlaylistExplorerController.view.children[0].appendChild(playlistViewsFragment);

        // PlaylistExplorerController.view.querySelector("button").addEventListener("click", () => {
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
        //                     PlaylistExplorerController.cardInterface.getController("playlists").appendPlaylist(response.data);
        //                 } else {
        //                     alert(response.serverError.message);
        //                 }
        //             });
        //     }
        // });
    }

    static appendNewPlaylistView(playlist) {
        const playlistView = PlaylistExplorerController.createPlaylistView(playlist);
        PlaylistExplorerController.view.firstElementChild.appendChild(playlistView);
    }

    static appendNewTrackView(playlist, trackPosition) {
        //NOTE: Playlist's index matches its playlistView index inside playlistViewController
        const playlistView = PlaylistExplorerController.view.firstElementChild.children[playlist.index];
        const trackView = PlaylistExplorerController.createTrackView(trackPosition);
        playlistView.children[1].appendChild(trackView);
    }

    static removePlaylistView(playlistIndex) {
        for (let i = 0; i < PlaylistExplorerController.view.firstElementChild.children.length; i++) {
            if (PlaylistExplorerController.view.firstElementChild.children[i].dataset.playlistIndex === playlistIndex.toString()) {
                PlaylistExplorerController.view.firstElementChild.children[i].remove();
                break;
            }
        }
    }

    static removeTrackView(trackPosition) {
        const playlistViews = PlaylistExplorerController.view.firstElementChild.children;
        let playlistView = null;
        playlistViewIterator: for (let i = 0; i < PlaylistExplorerController.view.firstElementChild.children.length; i++) {
            if (playlistViews[i].dataset.playlistIndex === trackPosition.playlistIndex.toString()) {
                playlistView = playlistViews[i];
                for (let j = 0; j < playlistView.children[1].children.length; j++) {
                    if (playlistView.children[1].children[j].dataset.trackIndex === trackPosition.trackIndex.toString()) {
                        playlistView.children[1].children[j].remove();
                        break playlistViewIterator;
                    }
                }
            }
        }

        //If all tracks views are removed, also delete the playlist view
        if (playlistView.children[1].children.length === 0) {
            playlistView.remove();
        }
    }

    static createPlaylistView(playlist) {
        const playlistView = PlaylistExplorerController.playlistViewTemplate.cloneNode(true);
        playlistView.removeAttribute("id");
        playlistView.firstElementChild.firstElementChild.textContent = playlist.name;
        playlistView.dataset.playlistIndex = playlist.index.toString();
        playlistView.firstElementChild.firstElementChild.addEventListener("click", () => {
            playlistView.children[1].classList.toggle("inactive");

            if (playlistView.children[1].childElementCount === 0) {
                for (let trackIndex = 0; trackIndex < playlist.tracks.length; trackIndex++) {
                    const trackView = PlaylistExplorerController.createTrackView({ playlistIndex: playlist.index, trackIndex: trackIndex });
                    playlistView.children[1].appendChild(trackView);
                }
            }
        });

        playlistView.firstElementChild.firstElementChild.addEventListener("contextmenu", (event) => {
            event.preventDefault();
            ContextController.setupPlaylistContext(playlist.name, playlist.index);
            ContextController.show();
        });

        return playlistView;
    }

    static createTrackView(trackPosition) {
        const playlists = PlaylistExplorerController.cardInterface.getController("musicSource").getPlaylists();
        const trackView = PlaylistExplorerController.trackViewTemplate.cloneNode(true);
        trackView.removeAttribute("id");
        if (playlists[trackPosition.playlistIndex].tracks[trackPosition.trackIndex].title) {
            trackView.textContent = playlists[trackPosition.playlistIndex].tracks[trackPosition.trackIndex].title;
        } else {
            const track = playlists[trackPosition.playlistIndex].tracks[trackPosition.trackIndex];
            trackView.textContent = track.path.slice(track.path.lastIndexOf("/") + 1, track.path.lastIndexOf("."))
        }
        trackView.dataset.playlistIndex = trackPosition.playlistIndex.toString();
        trackView.dataset.trackIndex = trackPosition.trackIndex.toString();

        trackView.addEventListener("click", (event) => {
            PlaylistExplorerController.cardInterface.getController("playback").setPlaylist(PlaylistExplorerController.cardInterface.getController("musicSource").getPlaylistAt(trackPosition.playlistIndex))
            PlaylistExplorerController.cardInterface.getController("playback").loadTrackAt(trackPosition.trackIndex, true);
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

            ContextController.setupTrackContext(titleTextContent, trackPosition);
            ContextController.show();
        });

        return trackView;
    }

    static search(keyword) {
        keyword = keyword.toLowerCase();
        let found = false;

        const panelDivisionSectorItems = document.getElementsByClassName("panelDivisionSectorItem");
        for (let i = 0; i < panelDivisionSectorItems.length; i++) {
            if (panelDivisionSectorItems[i].textContent.toLowerCase().includes(keyword)) {
                panelDivisionSectorItems[i].scrollIntoView();
                PlaylistExplorerController.cardInterface.getController("playback").setPlaylist(PlaylistExplorerController.cardInterface.getController("musicSource").getPlaylistAt(parseInt(panelDivisionSectorItems[i].dataset.playlistIndex)));
                PlaylistExplorerController.cardInterface.getController("playback").loadTrackAt(parseInt(panelDivisionSectorItems[i].dataset.trackIndex), false);
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