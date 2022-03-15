function ViewModel() {
	var self = this;
	self.dataReady = ko.observable(false);
	self.messages = ko.observable('Fetching...');
    self.scale = ko.observable(1.0);
    self.creatureClasses = ko.observableArray([]);
	self.allLocations = ko.observableArray([]);
	self.locations = ko.observableArray([]);
	self.selectedCreatureClass = ko.observable();
	
	self.Init = function () {
		ko.applyBindings(self);
		$.ajax({
			type: 'GET',
			url: 'data.json',
			dataType: 'json',
			mimeType: 'application/json',
			success: function (data) {
				self.creatureClasses(data['CreatureClasses']);
				self.allLocations(data['Locations']);
				self.dataReady(true);
			},
			error: function (jqXHR, textStatus, errorThrown) {
				self.messages(errorThrown);
				$('#messages').attr("class", "alert alert-danger");
				// TODO : Text not displaying correctly
				$('#track-info').html("Error: " + errorThrown);
			}
		});

	};
}

var vm = new ViewModel();
vm.Init();