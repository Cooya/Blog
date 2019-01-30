// syntax : ^^map (123, 456) "Point A" (789, 321) "Point B" [zoom=6]

module.exports = () => {
	return {
		type: 'lang', // before HTML convertion
		regex: /\^\^map \(-?[0-9.]+, ?-?[0-9.]+\)( ".+")?( \(-?[0-9.]+, ?-?[0-9.]+\)( ".+")?)?( \[zoom=[0-9]+\])?/gi,
		replace: function(str, title, text) {
			const pos = str.match(/-?[0-9.]+/g);
			//console.debug(pos);
			const caption = str.match(/"[^"]+"/g);
			//console.debug(caption);
			let zoom = str.match(/\[zoom=([0-9]+)\]/);
			zoom = zoom ? zoom[1] : 6;
			//console.debug(zoom);
			const output = `<div id="map" style="height: 600px; margin-bottom: 50px"></div><script>
				window.onload = function() {
					var map = L.map("map").setView([${pos[0]}, ${pos[1]}], ${zoom});
					L.marker([${pos[0]}, ${pos[1]}]).addTo(map);
					if(${pos.length} >= 4) {
						L.marker([${pos[2]}, ${pos[3]}]).addTo(map);
						new L.SwoopyArrow([${pos[0]}, ${pos[1]}], [${pos[2]}, ${pos[3]}], {
							color: '#FF0000',
							textClassName: 'swoopy-arrow',
							minZoom: 3,
							maxZoom: 10,
							weight: 1.5
						}).addTo(map);
					}
					L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
						attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
					}).addTo(map);
				}
			</script>`;
			//console.debug(output);
			return output;
		}
	};
};
