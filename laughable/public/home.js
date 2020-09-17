function storeMeetingURI(meeting_uri) {
    localStorage.setItem("meeting_uri", meeting_uri);
    location.href = "../audience.html";
}

