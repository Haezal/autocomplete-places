import * as React from 'react';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import parse from 'autosuggest-highlight/parse';
import throttle from 'lodash/throttle';
import { GoogleMap, useLoadScript, Marker } from '@react-google-maps/api';
import {
  getGeocode,
  getLatLng,
} from "use-places-autocomplete";

const autocompleteService = { current: null };
const libraries = ['places'];
  const mapContainerStyle = {
    width: '100vw',
    height: '100vh',
  }
  const center = {
    lat: 3.0632349,
    lng: 101.6726866,
  }

export default function GoogleMaps() {

  const {isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: '<use your own api key>',
    libraries
  });
  
  const [markers, setMarkers] = React.useState([]);
  const [selected, setSelected] = React.useState(null);

  const mapRef = React.useRef();
  const onMapLoad = React.useCallback((map) => {
    mapRef.current = map;
  }, []);

  const panTo = React.useCallback(({ lat, lng }) => {
    mapRef.current.panTo({ lat, lng });
    mapRef.current.setZoom(14);
  }, []);

  if (loadError) return "Error loading maps";
  if (!isLoaded) return "Loading Maps";

  return (
    <div>
      <Search panTo={panTo} />
      <GoogleMap 
          id="map"
          mapContainerStyle={mapContainerStyle}
          zoom={8}
          center={center}
          onLoad={onMapLoad}
        >
          <Marker
            key={`${panTo.lat}-${panTo.lng}`}
            position={{ lat: panTo.lat, lng: panTo.lng }}
          />
        </GoogleMap>
    </div>
  );
}

function Search ({ panTo }) {
  const [value, setValue] = React.useState(null);
  const [inputValue, setInputValue] = React.useState('');
  const [options, setOptions] = React.useState([]);
  const loaded = React.useRef(false);

  if (typeof window !== 'undefined' && !loaded.current) {
    if (!document.querySelector('#google-maps')) {

    }

    loaded.current = true;
  }

  const fetch = React.useMemo(
    () =>
      throttle((request, callback) => {
        autocompleteService.current.getPlacePredictions(request, callback);
      }, 200),
    [],
  );

  React.useEffect(() => {
    let active = true;

    if (!autocompleteService.current && window.google) {
      autocompleteService.current =
        new window.google.maps.places.AutocompleteService();
    }
    if (!autocompleteService.current) {
      return undefined;
    }

    if (inputValue === '') {
      setOptions(value ? [value] : []);
      return undefined;
    }

    fetch({ input: inputValue }, (results) => {
      if (active) {
        let newOptions = [];

        if (value) {
          newOptions = [value];
        }

        if (results) {
          newOptions = [...newOptions, ...results];
        }

        setOptions(newOptions);
      }
    });

    return () => {
      active = false;
    };
  }, [value, inputValue, fetch]);
  return <div className='search'>
    <Autocomplete
    id="google-map-demo"
    sx={{ width: 300 }}
    getOptionLabel={(option) =>
      typeof option === 'string' ? option : option.description
    }
    filterOptions={(x) => x}
    options={options}
    autoComplete
    includeInputInList
    filterSelectedOptions
    value={value}
    onChange={async (event, newValue) => {
      setOptions(newValue ? [newValue, ...options] : options);
      setValue(newValue);
      // console.log(newValue.description);
      var address = newValue.description;
      // console.log(address);
      
      try {
        const results = await getGeocode({ address });
        const { lat, lng } = await getLatLng(results[0]);
        panTo({ lat, lng });
      } catch (error) {
        console.log("😱 Error: ", error);
      }
    }}
    onInputChange={(event, newInputValue) => {
      setInputValue(newInputValue);
    }}
    renderInput={(params) => (
      <TextField {...params} label="Search location" fullWidth />
    )}
    renderOption={(props, option) => {
      const matches = option.structured_formatting.main_text_matched_substrings;
      const parts = parse(
        option.structured_formatting.main_text,
        matches.map((match) => [match.offset, match.offset + match.length]),
      );

      return (
        <li {...props}>
          <Grid container alignItems="center">
            <Grid item xs>
              {parts.map((part, index) => (
                <span
                  key={index}
                  style={{
                    fontWeight: part.highlight ? 700 : 400,
                  }}
                >
                  {part.text}
                </span>
              ))}

              <Typography variant="body2" color="text.secondary">
                {option.structured_formatting.secondary_text}
              </Typography>
            </Grid>
          </Grid>
        </li>
      );
    }}
  />
  </div>;
}