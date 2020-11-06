//@ts-check
export class ZoomImage {
    view = null;

    constructor(imageMetaDatum, orientation, color) {
        this.view = window.cardInterface.getTemplate(".zoomImage").cloneNode(true);

        this.view.classList.add(`zoomImage-${orientation}`);
        this.view.style.zIndex = document.querySelectorAll(".zoomImage").length.toString();
        this.view.style.backgroundImage = `url("/liveWall/${imageMetaDatum.path.replace(window.cardInterface.getRootDirectoryPath(), "")}")`;
        this.view.style.borderColor = color;
        if (window.innerHeight >= window.innerWidth) {
            this.view.style.height = ((window.innerWidth * 90 / 100) * imageMetaDatum.hwRatio) + "px";
        } else if (window.innerHeight < window.innerWidth) {
            this.view.style.width = ((window.innerHeight * 90 / 100) / imageMetaDatum.hwRatio) + "px";
        }

        this.view.addEventListener("touchstart", (event) => {
            if (event.touches.length === 1) {
                this.focus();
                this.startDrag(event);
            } else if (event.touches.length === 2) {
                this.startPinch(event);
            }
        });

        this.view.addEventListener("mousedown", (event) => {
            this.focus();
            this.startDrag(event);
        });

        const closeButton = this.view.querySelector(".button");
        closeButton.style.backgroundColor = color;
        closeButton.addEventListener("click", (event) => {
            this.view.style.animationName = "removeZoomImage";
            setTimeout(() => {
                this.view.remove();
            }, 250);
        });
    }

    getView() {
        return this.view;
    }

    focus() {
        const zoomImageViews = document.querySelectorAll(".zoomImage");
        for (let i = 0; i < zoomImageViews.length; i++) {
            zoomImageViews[i].style.zIndex = i.toString();
        }
        this.view.style.zIndex = zoomImageViews.length.toString();
    }

    startDrag(event) {
        //Get a reference of "this" for inner functions
        const zoomImage = this;
        event.preventDefault();
        //Get the originalMousePositions
        const originalMousePositionX = event.screenX || event.touches[0].screenX;
        const originalMousePositionY = event.screenY || event.touches[0].screenY;
        //Add eventListeners
        window.addEventListener("mousemove", dragMove);
        window.addEventListener("touchmove", dragMove);
        window.addEventListener("mouseup", endDrag);
        window.addEventListener("touchend", endDrag);
        //Declare and initialize variables to store difference
        let differenceX = 0;
        let differenceY = 0;
        //Define the handler for mouseMove event
        function dragMove(event) {
            //Check if a multi finger gesture started
            if (event.touches && (event.touches.length > 1)) {
                //If there is a multi finger gesture, endDragZoomImage
                endDrag();
            }
            //Calculate the travelledDistance of the mouse as a vector
            differenceX = (event.screenX || event.touches[0].screenX) - originalMousePositionX;
            differenceY = (event.screenY || event.touches[0].screenY) - originalMousePositionY;
            //Translate zoomImage accordingly
            zoomImage.view.style.transform = `translate(${differenceX}px, ${differenceY}px)`;
        }
        //Define the handler for mouseup event
        function endDrag() {
            //Apply translation into permanent position
            const zoomImageStyles = getComputedStyle(zoomImage.view);
            zoomImage.view.style.left = (parseFloat(zoomImageStyles.left) + differenceX) + "px";
            zoomImage.view.style.top = (parseFloat(zoomImageStyles.top) + differenceY) + "px";
            //Remove translation
            zoomImage.view.style.transform = "none";
            //Remove all previously added eventListeners
            window.removeEventListener("mousemove", dragMove);
            window.removeEventListener("touchmove", dragMove);
            window.removeEventListener("mouseup", endDrag);
            window.removeEventListener("touchend", endDrag);
        }
    }

    startPinch(event) {
        //Get a reference of "this" for inner functions
        const zoomImage = this;
        event.preventDefault();
        //Get the originalFingerDistance
        const originalFingerDistance = Math.sqrt(Math.pow(event.touches[1].clientY - event.touches[0].clientY, 2) + Math.pow(event.touches[1].clientX - event.touches[0].clientX, 2));
        //Add eventListeners
        window.addEventListener("touchmove", pinchMove);
        window.addEventListener("touchend", endPinch);
        //Declare and initiate variables to store difference
        let scale = 1;
        //Define the handler for touchmove event
        function pinchMove(event) {
            //Calculate the newFingerDistance
            const newFingerDistance = Math.sqrt(Math.pow(event.touches[1].clientY - event.touches[0].clientY, 2) + Math.pow(event.touches[1].clientX - event.touches[0].clientX, 2));
            //Scale zoomImage accordingly
            scale = newFingerDistance / originalFingerDistance;
            zoomImage.view.style.transform = `scale(${scale})`;
        }
        //Define the handler for mouseup event
        function endPinch() {
            //Apply translation into permanent position
            const zoomImageBoundingRect = zoomImage.view.getBoundingClientRect();
            zoomImage.view.style.top = zoomImageBoundingRect.top + "px";
            zoomImage.view.style.left = zoomImageBoundingRect.left + "px";
            zoomImage.view.style.width = zoomImageBoundingRect.width + "px";
            zoomImage.view.style.height = zoomImageBoundingRect.height + "px";
            //Remove translation
            zoomImage.view.style.transform = "none";
            //Remove all previously added eventListeners
            window.removeEventListener("touchmove", pinchMove);
            window.removeEventListener("touchend", endPinch);
        }
    }
}