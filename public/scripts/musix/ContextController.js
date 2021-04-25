import { PlaylistExplorerController } from "./PlaylistExplorerController.js";

//@ts-check
export class ContextController {
    static cardInterface = null;

    static view = null;

    static init(cardInterface, panelContainer) {
        ContextController.cardInterface = cardInterface;

        ContextController.view = panelContainer;

        ContextController.view.querySelector(".buttonContainer span").addEventListener("click", () => {
            ContextController.hide();
        });

        //Add onclick to downloadPlaylistButton for downloading the playlist
        ContextController.view.children[0].children[1].addEventListener("click", () => {
            location.href = `/musix/playlists/${ContextController.view.children[0].dataset.playlistIndex}`;
            ContextController.hide();
        });
        //Add onclick to removePlaylistButton for removing the playlist
        ContextController.view.children[0].children[2].addEventListener("click", () => {
            const playlistIndex = parseInt(ContextController.view.children[0].dataset.playlistIndex);
            ContextController.cardInterface.getController("musicSource").removePlaylistAt(playlistIndex);
            ContextController.hide();
        });
        //Add onclick to continuePlaylistButton for continuing the playlist
        ContextController.view.children[0].children[3].addEventListener("click", () => {
            const playlistIndex = parseInt(ContextController.view.children[0].dataset.playlistIndex);
            PlaylistExplorerController.cardInterface.getController("playback").setPlaylist(PlaylistExplorerController.cardInterface.getController("musicSource").getPlaylistAt(playlistIndex));
            if (localStorage.getItem(playlistIndex.toString())) {
                //CASE: The playlist has been played before
                //Continue playlist
                PlaylistExplorerController.cardInterface.getController("playback").loadTrackAt(parseInt(localStorage.getItem(playlistIndex.toString())), true);
            } else {
                //CASE: The playlist hasn't been played before
                //PLay from beginning
                PlaylistExplorerController.cardInterface.getController("playback").loadTrackAt(0, true);
            }
            ContextController.hide();
        });

        //Add onclick to downloadTrackButton for downloading the track
        ContextController.view.children[1].children[2].addEventListener("click", () => {
            location.href = `/musix/playlists/${ContextController.view.children[1].dataset.playlistIndex}/tracks/${ContextController.view.children[1].dataset.trackIndex}`;
            ContextController.hide();
        });
        //Add onclick to removeTrack button for removing the track from playlist
        ContextController.view.children[1].children[3].addEventListener("click", () => {
            const trackPosition = {
                playlistIndex: parseInt(ContextController.view.children[1].dataset.playlistIndex),
                trackIndex: parseInt(ContextController.view.children[1].dataset.trackIndex)
            };
            ContextController.cardInterface.getController("musicSource").removeTrackAt(trackPosition);
            ContextController.hide();
        });
        //Add onclick to addToQuickPlaylist button for adding the track to quickPlaylist
        ContextController.view.children[1].children[4].addEventListener("click", () => {
            ContextController.cardInterface.getController("musicSource").addToQuickPlaylist(ContextController.cardInterface.getController("musicSource").getTrackAt({
                trackIndex: parseInt(ContextController.view.children[1].dataset.trackIndex),
                playlistIndex: parseInt(ContextController.view.children[1].dataset.playlistIndex),
            }));
            ContextController.hide();
        });
    }

    static show(panelQuery, additionalData = null) {
        ContextController.view.dataset.lastPanelQuery = panelQuery;

        const panel = ContextController.view.querySelector(panelQuery);
        
        if (panelQuery === "#playlistContextPanel") {
            panel.dataset.playlistIndex = additionalData.playlistIndex;
            panel.children[0].textContent = additionalData.playlistName;
        } else if (panelQuery === "#trackContextPanel") {
            panel.dataset.playlistIndex = additionalData.playlistIndex;
            panel.dataset.trackIndex = additionalData.trackIndex;
            panel.children[0].textContent = additionalData.playlistName;
            panel.children[1].textContent = additionalData.trackTitle;
        }
        
        ContextController.view.classList.replace("popOut", "popIn");
        panel.classList.replace("popOut", "popIn");
    }

    static hide() {
        ContextController.view.querySelector(ContextController.view.dataset.lastPanelQuery).classList.replace("popIn", "popOut");

        setTimeout(() => {
            ContextController.view.classList.replace("popIn", "popOut");
        }, 250);
    }
}