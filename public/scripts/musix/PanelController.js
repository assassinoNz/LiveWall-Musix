import { PlaylistExplorerController } from "./PlaylistExplorerController.js";

//@ts-check
export class PanelController {
    static cardInterface = null;

    static view = null;

    static init(cardInterface, panelContainer) {
        PanelController.cardInterface = cardInterface;

        PanelController.view = panelContainer;

        PanelController.view.querySelector(".buttonContainer span").addEventListener("click", () => {
            PanelController.hide();
        });

        //Add onclick to downloadPlaylistButton for downloading the playlist
        PanelController.view.children[0].children[1].addEventListener("click", () => {
            location.href = `/musix/playlists/${PanelController.view.children[0].dataset.playlistIndex}`;
            PanelController.hide();
        });
        //Add onclick to removePlaylistButton for removing the playlist
        PanelController.view.children[0].children[2].addEventListener("click", () => {
            const playlistIndex = parseInt(PanelController.view.children[0].dataset.playlistIndex);
            PanelController.cardInterface.getController("musicSource").removePlaylistAt(playlistIndex);
            PanelController.hide();
        });
        //Add onclick to continuePlaylistButton for continuing the playlist
        PanelController.view.children[0].children[3].addEventListener("click", () => {
            const playlistIndex = parseInt(PanelController.view.children[0].dataset.playlistIndex);
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
            PanelController.hide();
        });

        //Add onclick to downloadTrackButton for downloading the track
        PanelController.view.children[1].children[2].addEventListener("click", () => {
            location.href = `/musix/playlists/${PanelController.view.children[1].dataset.playlistIndex}/tracks/${PanelController.view.children[1].dataset.trackIndex}`;
            PanelController.hide();
        });
        //Add onclick to removeTrack button for removing the track from playlist
        PanelController.view.children[1].children[3].addEventListener("click", () => {
            const trackPosition = {
                playlistIndex: parseInt(PanelController.view.children[1].dataset.playlistIndex),
                trackIndex: parseInt(PanelController.view.children[1].dataset.trackIndex)
            };
            PanelController.cardInterface.getController("musicSource").removeTrackAt(trackPosition);
            PanelController.hide();
        });
        //Add onclick to addToQuickPlaylist button for adding the track to quickPlaylist
        PanelController.view.children[1].children[4].addEventListener("click", () => {
            PanelController.cardInterface.getController("musicSource").addToQuickPlaylist(PanelController.cardInterface.getController("musicSource").getTrackAt({
                trackIndex: parseInt(PanelController.view.children[1].dataset.trackIndex),
                playlistIndex: parseInt(PanelController.view.children[1].dataset.playlistIndex),
            }));
            PanelController.hide();
        });
    }

    static show(panelQuery, additionalData = null) {
        PanelController.view.dataset.lastPanelQuery = panelQuery;

        const panel = PanelController.view.querySelector(panelQuery);
        
        if (panelQuery === "#playlistContextPanel") {
            panel.dataset.playlistIndex = additionalData.playlistIndex;
            panel.children[0].textContent = additionalData.playlistName;
        } else if (panelQuery === "#trackContextPanel") {
            panel.dataset.playlistIndex = additionalData.playlistIndex;
            panel.dataset.trackIndex = additionalData.trackIndex;
            panel.children[0].textContent = additionalData.playlistName;
            panel.children[1].textContent = additionalData.trackTitle;
        }
        
        PanelController.view.classList.replace("popOut", "popIn");
        panel.classList.replace("popOut", "popIn");
    }

    static hide() {
        PanelController.view.querySelector(PanelController.view.dataset.lastPanelQuery).classList.replace("popIn", "popOut");

        setTimeout(() => {
            PanelController.view.classList.replace("popIn", "popOut");
        }, 250);
    }
}