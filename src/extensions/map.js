// syntax : ^^map {(123, 456) "Point A" (789, 321) "Point B"} [zoom=6]

const DEFAULT_ZOOM = 6;

module.exports = () => {
	return {
		type: 'lang', // before HTML convertion
		regex: /\^\^map {(\n?\(-?[0-9.]+, ?-?[0-9.]+\)( ".+")?( ->)?\n?)+}( \[zoom=[0-9]+\])?/gi,
		replace: function(str, title, text) {
			// parse the lat/long couples
			const latLong = str.match(/\(-?[0-9.]+, ?-?[0-9.]+\)( ".+")?( ->)?/g).map((val) => {
				const arr = val.match(/-?[0-9.]+/g);
				const caption = val.match(/"(.+)"/);
				arr.push(caption ? caption[1] : null);
				arr.push(val.match(/->/) ? true : false);
				return arr;
			});

			// parse the zoom parameter
			let zoom = str.match(/\[zoom=([0-9]+)\]/);
			zoom = zoom ? zoom[1] : DEFAULT_ZOOM;

			// compute the average lat/long to center the view
			let avgLatLong = [0, 0];
			latLong.forEach((val) => {
				avgLatLong[0] += new Number(val[0]);
				avgLatLong[1] += new Number(val[1]);
			});
			avgLatLong[0] /= latLong.length;
			avgLatLong[1] /= latLong.length;

			// build the output
			let output = `<div id="map" style="height: 600px; margin-bottom: 50px"></div><script>
				window.onload = function() {
				var map = L.map("map").setView([${avgLatLong[0]}, ${avgLatLong[1]}], ${zoom});\n
				let marker;`;
			let ll;
			for (let i = 0; i < latLong.length; ++i) {
				ll = latLong[i];
				output += `marker = L.marker([${ll[0]}, ${ll[1]}]).addTo(map);\n`;
				if (ll[2]) output += `marker.bindPopup("${ll[2]}", {autoClose: false}).openPopup();`;
				if (ll[3] && i + 1 < latLong.length)
					output += `new L.SwoopyArrow([${ll[0]}, ${ll[1]}], [${latLong[i + 1][0]}, ${latLong[i + 1][1]}], {
						color: '#FF0000',
						textClassName: 'swoopy-arrow',
						minZoom: 3,
						maxZoom: 10,
						weight: 1.5
					}).addTo(map);`;
			}
			output += `L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
				attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
				}).addTo(map);}</script>`;
			return output;
		}
	};
};
