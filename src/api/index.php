<?php
header("Content-Type: application/json");

$parts = parse_url($_SERVER['REQUEST_URI']);
parse_str($parts['query'], $query);

if(!array_key_exists('id', $query))
{
    echo "{}";
    exit;
}

if(preg_match('/[/\.]/', $query['id']))
{
    echo "{}";
    exit;
}

$filename = '../data/' . $query['id'] . '.json';

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