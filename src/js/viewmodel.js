ko.bindingHandlers.position = {
	init: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
		var value = valueAccessor();
		//$(element).text('lat: ' + value.Lat + ', lon: ' + value.Lon);
		let parent = bindingContext['$parent'];
		$(element).css({
                top: parent.ConvertLatToX(value.Lat), 
                left: parent.ConvertLonToY(value.Lon),
                'background-color': LevelToColor(value.Level)
        });
	},
	update: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
	}
  };
 
function LevelToColor(level) {
    if(level < 25)
        return 'white';
    
    if(level < 50)
        return 'green';

    if(level < 75)
        return 'blue';
    
    if(level < 100)
        return 'purple';
    
    if(level < 125)
        return 'yellow';
    
    return 'red';
}

function Compare(left, right) {
	if (left < right)
		return -1;

	if (left > right)
		return 1;

	return 0;
}

const markerSize = 5;

function ViewModel() {
	var self = this;
	self.dataReady = ko.observable(false);
	self.messages = ko.observable('Fetching...');
    self.scale = ko.observable(1.0);
    self.creatureClasses = ko.observableArray([]);
	self.allLocations = ko.observableArray([]);
	self.locations = ko.observableArray([]);
	self.lastUpdated = ko.observable('unknown');
	self.selectedCreatureClass = ko.observable();
	self.selectedCreatureClass.subscribe(function(newValue) {
		if(newValue)
			self.locations(self.allLocations()[newValue.ClassName]);
		else
			self.locations([]);
	});
	self.ConvertLatToX = function(lat) {
		const maxHeight = 2048;
		let currentHeight = $("#mapImage").height();
		let scale = currentHeight / maxHeight;
		let factor = 20;
		const top = 30;
		return (top + (factor * lat) - (markerSize / 2)) * scale;
	};
	self.ConvertLonToY = function(lon) {
		const maxWidth = 2048;
		let currentWidth = $("#mapImage").width();
		let scale = currentWidth / maxWidth;
		let factor = 20;
		const left = 40;
		return (left + (factor * lon) - (markerSize / 2)) * scale;
	};

	self.fetchData = function(url) {
		return new Promise((resolve, reject) => {
			$.ajax({
				type: 'GET',
				url: url,
				dataType: 'json',
				mimeType: 'application/json',
				success: function (data) {
					resolve(data);
				},
				error: function (error) {
					reject(error);
				}
			});
		});
	}
	
	self.Init = function () {
		ko.applyBindings(self);

		Promise.all([self.fetchData('data.json'), self.fetchData('class-mapping.json')])
			.then((values) => {
				let data = values[0];
				self.lastUpdated(data['LastUpdated']);

				let mappings = values[1];
				let creatureClasses = [];
				for (let index = 0; index < data['CreatureClasses'].length; index++) {
					const element = data['CreatureClasses'][index];

					let name = mappings[element];
					if(name == null)
						name = element;

					let item = new CreatureClass(element, name);
					creatureClasses.push(item);
				}
				creatureClasses.sort(function (left, right) {
					return Compare(left.Text, right.Text);
				});
				self.creatureClasses(creatureClasses);
				self.allLocations(data['Locations']);
				self.dataReady(true);
			})
			.catch((errors) => {

				let error = '';

				for (let index = 0; index < errors.length; index++) {
					const element = errors[index];
					error += element;
				}

				self.messages(error);
				$('#messages').attr("class", "alert alert-danger");
				// TODO : Text not displaying correctly
				$('#track-info').html("Error: " + error);
			});
	};
}

function CreatureClass(className, name) {
	let self = this;
	self.ClassName = className;
	self.Text = name;
}

var vm = new ViewModel();
vm.Init();