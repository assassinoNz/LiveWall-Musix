import { PlaylistExplorerController } from "./PlaylistExplorerController.js";

//@ts-check
export class PanelController {
    static cardInterface = null;

    static view = null;

    static init(cardInterface, panelContainer) {
        PanelController.cardInterface = cardInterface;

        PanelController.view = panelContainer;

        //Add onclick to all close buttons for hiding the panelContainer
        for (const closeButton of PanelController.view.querySelectorAll(".close")) {
            closeButton.addEventListener("click", PanelController.hide);
        }

        //Add onclick to downloadPlaylistButton for downloading the playlist
        PanelController.view.children[0].children[1].addEventListener("click", () => {
            location.href = `/musix/playlists/${PanelController.view.children[0].dataset.playlistIndex}`;
            PanelController.hide();
        });
        //Add onclick to removePlaylistButton for removing the playlist
        PanelController.view.children[0].children[2].addEventListener("click", () => {
            PanelController.cardInterface.getController("musicSource").removePlaylistAt(parseInt(PanelController.view.children[0].dataset.playlistIndex));
            PanelController.hide();
        });
        //Add onclick to continuePlaylistButton for continuing the playlist
        PanelController.view.children[0].children[3].addEventListener("click", () => {
            const playlistIndex = parseInt(PanelController.view.children[0].dataset.playlistIndex);
            const playlistName = PanelController.cardInterface.getController("musicSource").getPlaylistAt(playlistIndex).name;
            if (localStorage.getItem(playlistName)) {
                //CASE: The playlist has been played before
                //Continue playlist
                PlaylistExplorerController.cardInterface.getController("playback").loadTrack({ playlistIndex: playlistIndex, trackIndex: parseInt(localStorage.getItem(playlistName)) }, true);
            } else {
                //CASE: The playlist hasn't been played before
                //Play from beginning
                PlaylistExplorerController.cardInterface.getController("playback").loadTrack({ playlistIndex: playlistIndex, trackIndex: 0 }, true);
            }
            PanelController.hide();
        });

        //Add onclick to downloadTrackButton for downloading the track
        PanelController.view.children[1].children[1].addEventListener("click", () => {
            location.href = `/musix/playlists/${PanelController.view.children[1].dataset.playlistIndex}/tracks/${PanelController.view.children[1].dataset.trackIndex}`;
            PanelController.hide();
        });
        //Add onclick to removeTrackButton for removing the track from playlist
        PanelController.view.children[1].children[2].addEventListener("click", () => {
            PanelController.cardInterface.getController("musicSource").removeTrackAt({
                playlistIndex: parseInt(PanelController.view.children[1].dataset.playlistIndex),
                trackIndex: parseInt(PanelController.view.children[1].dataset.trackIndex)
            });
            PanelController.hide();
        });
        //Add onclick to addToQuickPlaylistButton for adding the track to quickPlaylist
        PanelController.view.children[1].children[3].addEventListener("click", () => {
            PanelController.cardInterface.getController("musicSource").addToQuickPlaylist(PanelController.cardInterface.getController("musicSource").getTrackAt({
                trackIndex: parseInt(PanelController.view.children[1].dataset.trackIndex),
                playlistIndex: parseInt(PanelController.view.children[1].dataset.playlistIndex),
            }));
            PanelController.hide();
        });
        //Add onclick to playNextButton for updating the nextRelativeTrack
        PanelController.view.children[1].children[4].addEventListener("click", () => {
            const relativeTrackPositions = PanelController.cardInterface.getController("playback").getRelativeTrackPositions();
            relativeTrackPositions.next = {
                trackIndex: parseInt(PanelController.view.children[1].dataset.trackIndex),
                playlistIndex: parseInt(PanelController.view.children[1].dataset.playlistIndex),
            };
            PanelController.hide();
        });

        //Add onkeypress to searchInput for displaying search results
        PanelController.view.children[2].children[1].addEventListener("keypress", (event) => {
            if (event.key === "Enter") {
                event.target.blur();
                PlaylistExplorerController.search(event.target.value);
            }
        });
        
        //Add onclick to submitButton for submitting the playlist
        PanelController.view.children[3].children[1].addEventListener("click", (event) => {
            PanelController.cardInterface.getController("musicSource").exportPlaylists().then(() => {
                PanelController.hide();
            });
        });
    }

    static show(panelQuery, additionalData = null) {
        PanelController.view.dataset.lastPanelQuery = panelQuery;

        const panel = PanelController.view.querySelector(panelQuery);

        if (panelQuery === "#playlistContextPanel") {
            panel.dataset.playlistIndex = additionalData.playlistIndex;
            panel.children[0].children[0].textContent = additionalData.playlistName;
        } else if (panelQuery === "#trackContextPanel") {
            panel.dataset.playlistIndex = additionalData.playlistIndex;
            panel.dataset.trackIndex = additionalData.trackIndex;
            panel.children[0].children[0].textContent = additionalData.playlistName;
            panel.children[0].children[1].textContent = additionalData.trackTitle;
        }

        PanelController.view.classList.replace("popOut", "popIn");
        panel.classList.replace("popOut", "popIn");
    }

    static hide() {
        PanelController.view.querySelector(PanelController.view.dataset.lastPanelQuery).classList.replace("popIn", "popOut");
        PanelController.view.classList.replace("popIn", "popOut");

        // setTimeout(() => {
        // }, 250);
    }
}