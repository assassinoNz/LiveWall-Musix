//@ts-check
export class Utility {
    static getCircularSliderValue(slider, rangeUpperLimit) {
        const startTheta = Number.parseFloat(slider.dataset.startTheta);
        const endTheta = Number.parseFloat(slider.dataset.endTheta);
        //Get sliderValue as theta
        const thetaString = slider.style.transform;
        const theta = thetaString.slice(7, thetaString.length - 4);
        //Calculate currentSeekedValue according to theta
        const unit = rangeUpperLimit / (endTheta-startTheta);
        const currentSeekedValue = (theta-startTheta) * unit;
        //Output currentSeekedValue
        return currentSeekedValue;
    }

    static setCircularSliderView(slider, rangeUpperLimit, value) {
        const startTheta = Number.parseFloat(slider.dataset.startTheta);
        const endTheta = Number.parseFloat(slider.dataset.endTheta);
        //Calculate the size of a single unit (seconds per degree)
        const unit = rangeUpperLimit / (endTheta - startTheta);
        //Calculate theta using currentTime
        const theta = value / unit;
        //Rotate seekSlider theta degrees
        slider.style.transform = `rotate(${startTheta+theta}deg)`;
    }

    static formatTime(totalSeconds) {
        //Calculate time to HH:MM:SS format
        const minutesAsFraction = totalSeconds / 60;
        const timeParts = ["", ""];
        let wholeMinutes = Math.floor(minutesAsFraction);
        let resultingSeconds = Math.round(60 * (minutesAsFraction - wholeMinutes));
        //Format integers for leading zeros
        if (wholeMinutes < 10) { timeParts[0] = "0" + wholeMinutes; }
        if (resultingSeconds < 10) { timeParts[1] = "0" + resultingSeconds; }
        //Output formatted time
        return timeParts;
    }

    static getRandInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    static getRandColor() {
        return `rgb(${Utility.getRandInt(100, 255)}, ${Utility.getRandInt(100, 255)}, ${Utility.getRandInt(100, 255)})`;
    }

    static toggleButtonGlyph(buttonGlyph) {
        if (buttonGlyph.classList.toggle("revealed")) {
            buttonGlyph.children[1].style.display = "block";
            buttonGlyph.children[1].focus();
        } else {
            buttonGlyph.children[1].style.display = "none";
        }
    }
}