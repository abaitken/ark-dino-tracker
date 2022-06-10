<?php
header("Content-Type: application/json");

function BuildDatasetFilename($query) {

    if(!array_key_exists('id', $query))
        return NULL;

    if(preg_match('/[/\.]/', $query['id']))
        return NULL;

    if(!array_key_exists('set', $query))
        return '../data/' . $query['id'] . '.json';
    
    return '../data/' . $query['set'] . '/' . $query['id'] . '.json';
}

$parts = parse_url($_SERVER['REQUEST_URI']);
parse_str($parts['query'], $query);

$filename = BuildDatasetFilename($query);

if($filename == NULL)
{
    echo "{}";
    exit;
}

if(!file_exists($filename))
{
    echo "{}";
    exit;
}

$format = 'full';

if(array_key_exists('format', $query))
    $format = $query['format'];

switch ($format) {
    case 'full':
        echo file_get_contents($filename);
        break;
    case 'timestamp':
        echo '{"timestamp": ' . filemtime($filename) . '}';
        break;
    default:
        echo "{}";
        break;
}