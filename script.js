import {Calendar} from "./renderer/Calendar.js";

window.onload = function () {
    // We now pass the legend container ID as the 3rd parameter
    new Calendar("datePicker", "calendar", "legend")
}
