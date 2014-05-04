var Storage = function() {
	this.data = {};
}

Storage.prototype.setData = function(track, index, data) {
	if (!this.data[track])
		this.data[track] = {};

	var track = this.data[track];
	track[index] = data;
}

Storage.prototype.getData = function(track, index) {
	var track = this.data[track];
	if (track[index])
		return track[index];

	return [];
}

Storage.prototype.getUndoData = function() {

}