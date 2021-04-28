//@ts-check
import { NavigationController } from "./NavigationController.js";
import { PlaylistExplorerController } from "./PlaylistExplorerController.js";
import { Utility } from "./Utility.js";

export class NowPlayingController {
    static cardInterface = null;

    static view = null;
    static seekSlider = null;
    static volumeSlider = null;
    static playTimeDisplayContainer = null;
    static trackDataDisplayContainer = null;
    static controls = null;

    static init(cardInterface, viewport) {
        NowPlayingController.cardInterface = cardInterface;

        NowPlayingController.view = viewport;
        NowPlayingController.seekSlider = NowPlayingController.view.querySelector("#seekSlider");
        NowPlayingController.volumeSlider = NowPlayingController.view.querySelector("#volumeSlider");
        NowPlayingController.playTimeDisplayContainer = NowPlayingController.view.querySelector("#playTimeDisplayContainer");
        NowPlayingController.trackDataDisplayContainer = NowPlayingController.view.querySelector("#trackDataDisplayContainer");
        NowPlayingController.controls = NowPlayingController.view.querySelectorAll("#controlsContainer>div>button");

        //Add onpointerdown to volumeSlider for changing volume
        //NOTE: Changing volume is done in realtime except in RemotePlay
        NowPlayingController.volumeSlider.addEventListener("pointerdown", (event) => {
            NowPlayingController.startSlide(event, null, () => {
                if (!NowPlayingController.cardInterface.getController("playback").isRemotePlay()) {
                    NowPlayingController.cardInterface.getController("playback").setVolume(Utility.getCircularSliderValue(NowPlayingController.volumeSlider, 1));
                }
            }, () => {
                NowPlayingController.cardInterface.getController("playback").setVolume(Utility.getCircularSliderValue(NowPlayingController.volumeSlider, 1));
            });
        });

        //Add events to all controls
        NowPlayingController.controls[0].addEventListener("click", (event) => {
            NowPlayingController.cardInterface.getController("musicSource").toggleSource();
        });
        NowPlayingController.controls[1].addEventListener("click", (event) => {
            NowPlayingController.cardInterface.getController("playback").toggleRemotePlay();
        });
    }

    static setState(state, value) {
        switch (state) {
            case "offline": {
                if (value) {
                    NowPlayingController.controls[0].classList.add("active");
                    NowPlayingController.controls[1].style.display = "none";
                } else {
                    NowPlayingController.controls[0].classList.remove("active");
                    NowPlayingController.controls[1].style.display = "initial";
                }

                break;
            }

            case "playback": {
                if (value) {
                    NowPlayingController.cardInterface.retrieveControls[1].firstElementChild.src = "/musix/images/musix/glyph_pause.png";
                    NavigationController.navigationControl.firstElementChild.src = "/musix/images/musix/glyph_pause.png";
                    NavigationController.navigationControl.classList.add("active");
                } else {
                    NowPlayingController.cardInterface.retrieveControls[1].firstElementChild.src = "/musix/images/musix/glyph_play.png";
                    NavigationController.navigationControl.firstElementChild.src = "/musix/images/musix/glyph_play.png";
                    NavigationController.navigationControl.classList.remove("active");
                }

                break;
            }

            case "remotePlay": {
                if (value) {
                    NowPlayingController.controls[1].classList.add("active");
                } else {
                    NowPlayingController.controls[1].classList.remove("active");
                }

                break;
            }
        }
    }

    static updateViewSection(section, value) {
        switch (section) {
            case "volume": {
                NowPlayingController.playTimeDisplayContainer.children[2].textContent = Math.round(value[1] * 100).toString();
                Utility.setCircularSliderView(NowPlayingController.volumeSlider, value[0], value[1]);
                break;
            }

            case "playlist": {
                //NOTE: Only set the playlist styling when the playlist differs from the current playlist
                const playlist = this.cardInterface.getController("musicSource").getPlaylistAt(value);
                NowPlayingController.trackDataDisplayContainer.children[0].textContent = playlist.name;
                document.styleSheets[0].cssRules[2].style.setProperty("--themeColor", playlist.themeColor);

                //Update media session
                navigator.mediaSession.metadata.artwork = [
                    { src: "images/musix/launcher_192.png", sizes: "192x192", type: "image/png" }
                ];

                break;
            }

            case "track": {
                NowPlayingController.trackDataDisplayContainer.children[1].textContent = value.title;
                NowPlayingController.trackDataDisplayContainer.children[2].textContent = value.artist;

                document.styleSheets[0].cssRules[3].cssRules[0].style.setProperty("--backgroundColor", Utility.getRandColor(25, 40));

                //Update media session
                navigator.mediaSession.metadata.title = value.title;
                navigator.mediaSession.metadata.artist = value.artist;
                navigator.mediaSession.metadata.album = value.album;

                break;
            }

            // case "position": {
            //Update media session
            // navigator.mediaSession.metadata.setPositionState({
            //     duration: value[0],
            //     playbackRate: value[1],
            //     position: value[2],
            // });
            //     break;
            // }

            case "time": {
                Utility.setCircularSliderView(NowPlayingController.seekSlider, value[0], value[1]);
                NowPlayingController.playTimeDisplayContainer.children[0].textContent = value[2];
                NowPlayingController.playTimeDisplayContainer.children[1].textContent = value[3];
                break;
            }
        }

    }

    static startSlide(event, executeBeforeDoSlide, executeWithDoSlide, executeAfterDoSlide) {
        //Get a reference of "event.currentTarget" for inner functions
        const slider = event.currentTarget;
        const startTheta = Number.parseFloat(slider.dataset.startTheta);
        const endTheta = Number.parseFloat(slider.dataset.endTheta);
        //Get the boundary of the slider
        const sliderRect = slider.getBoundingClientRect();
        //Calculate slider's center using sliderTrackPosition
        const sliderCenterX = (sliderRect.width / 2) + sliderRect.left;
        const sliderCenterY = (sliderRect.height / 2) + sliderRect.top;
        //Add eventListeners
        window.addEventListener("pointermove", doSlide);
        window.addEventListener("touchmove", doSlide);
        window.addEventListener("pointerup", endSlide);
        window.addEventListener("touchend", endSlide);
        //Execute additional functionality
        if (executeBeforeDoSlide) {
            executeBeforeDoSlide();
        }

        //INNER EVENT HANDLER FUNCTIONS
        function doSlide(event) {
            //Get mousePositions
            const pointerPositionY = event.clientY || event.touches[0].clientY;
            const pointerPositionX = event.clientX || event.touches[0].clientX;
            //Calculate lengths of the adjacentSide (distanceDifferenceY) and the oppositeSide (distanceDifferenceX) relative to sliderCenter;
            const distanceDifferenceX = sliderCenterX - pointerPositionX;
            const distanceDifferenceY = pointerPositionY - sliderCenterY;
            //Calculate theta(acute angle) after calculating tanTheta(absoluteValue)
            const tanTheta = Math.abs(distanceDifferenceX / distanceDifferenceY);
            let theta = Math.atan(tanTheta) * (180 / Math.PI);
            //Adjust theta considering circular sides
            if (distanceDifferenceX > 0 && distanceDifferenceY > 0) {
                theta = theta;
            } else if (distanceDifferenceX >= 0 && distanceDifferenceY < 0) {
                theta = 180 - theta;
            } else if (distanceDifferenceX < 0 && distanceDifferenceY < 0) {
                theta = 180 + theta;
            } else if (distanceDifferenceX <= 0 && distanceDifferenceY > 0) {
                theta = 360 - theta;
            } else if (distanceDifferenceX > 0 && distanceDifferenceY === 0) {
                theta = 90;
            } else if (distanceDifferenceX < 0 && distanceDifferenceY === 0) {
                theta = 270;
            }
            if (startTheta < theta && theta < endTheta) {
                //Rotate slider theta degrees
                slider.style.transform = `rotate(${theta}deg)`;
            }
            //Execute additional functionality
            if (executeWithDoSlide) {
                executeWithDoSlide();
            }
        }

        function endSlide() {
            //Remove added eventListeners
            window.removeEventListener("pointermove", doSlide);
            window.removeEventListener("touchmove", doSlide);
            window.removeEventListener("pointerup", endSlide);
            window.removeEventListener("touchend", endSlide);
            //Execute additional functionality
            if (executeAfterDoSlide) {
                executeAfterDoSlide();
            }
        }
    }


}