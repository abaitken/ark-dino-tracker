let DataTools = new function () {
    let self = this;

    self.GenerateDatasetUrl = function (id) {
        if (location.href.startsWith('file'))
            return 'data/' + id + '.json';

        return 'api/index.php?id=' + id;
    };

    self.GenerateChunkedDatasetUrl = function (datasetId, id) {
        if (location.href.startsWith('file'))
            return 'data/' + datasetId + '/' + id + '.json';

        return 'api/index.php?id=' + id + '&set=' + datasetId;
    };

    self.GenerateDatasetMetaUrl = function (id) {
        if (location.href.startsWith('file'))
            return 'data/' + id + '-meta.json';

        return 'api/index.php?id=' + id + '&format=meta';
    };

    self.GenerateChunkedDatasetMetaUrl = function (datasetId) {
        if (location.href.startsWith('file'))
            return 'data/' + datasetId + '/meta.json';

        return 'api/index.php?id=classes&set=' + datasetId + '&format=meta';
    };

    self.FetchData = function (url) {
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
    };

    self.GetDatasetMode = function(dataset) {
        let mode = 'monolith';
        if (dataset.hasOwnProperty('Mode'))
            mode = dataset['Mode'];

        switch (mode) {
            case 'monolith':
                return DATA_MODES.MONOLITH;
            case 'chunked':
                return DATA_MODES.CHUNKED;
            default:
                throw "Unexpected dataset mode '" + mode + "'";
        }
    };
};
