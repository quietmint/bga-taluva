<?php

class TaluvaSpace extends APP_GameClass
{
    public $new;
    public $x;
    public $y;
    public $z;
    public $r;
    public $face;
    public $tile_id;
    public $subface;
    public $tile_player_id;
    public $bldg_player_id;
    public $bldg_type;

    public function __construct($row)
    {
        $this->new = false;
        $this->x = (int) $row['x'];
        $this->y = (int) $row['y'];
        $this->z = (int) $row['z'];
        $this->r = (int) $row['r'];
        $this->face = (int) $row['face'];
        $this->tile_id = (int) @$row['tile_id'];
        $this->subface = (int) @$row['subface'];
        $this->tile_player_id = (int) @$row['tile_player_id'];
        $this->bldg_player_id = (int) @$row['bldg_player_id'];
        $this->bldg_type = (int) @$row['bldg_type'];
    }

    public function __toString()
    {
        return $this->x . ',' . $this->y . ',' . $this->z;
    }

    public function isEmpty()
    {
        return $this->new || $this->face === -1;
    }
}

class TaluvaBoard extends APP_GameClass implements JsonSerializable
{
    private $board = array();

    public function __construct($rows)
    {
        self::warn('CONSTRUCT TaluvaBoard: ' . json_encode($rows));
        foreach ($rows as $row) {
            $this->board[ (int) $row['x'] ][ (int) $row['y'] ][ (int) $row['z'] ] = new TaluvaSpace($row);
        }
    }

    public function jsonSerialize()
    {
        return $this->getSpaces();
    }

    public function isEmpty()
    {
        return empty($this->board);
    }

    public function getSpaces()
    {
        $spaces = array();
        foreach ($this->board as $x => $xrow) {
            foreach ($xrow as $y => $yrow) {
                foreach ($yrow as $z => $space) {
                    $spaces[] = $space;
                }
            }
        }
        return $spaces;
    }

    public function getSpace($x, $y, $z)
    {
        if (array_key_exists($x, $this->board) && array_key_exists($y, $this->board[$x]) && array_key_exists($z, $this->board[$x][$y])) {
            return $this->board[$x][$y][$z];
        }
        $empty = new TaluvaSpace(array(
            'x' => $x,
            'y' => $y,
            'z' => $z,
            'r' => 0,
            'face' => -1,
        ));
        $empty->new = true;
        return $empty;
    }

    public function getSpaceBelow($space)
    {
        return $this->getSpace($space->x, $space->y, $space->z - 1);
    }

    public function getSpaceAbove($space)
    {
        return $this->getSpace($space->x, $space->y, $space->z + 1);
    }

    public function getSpaceAdjacents($space)
    {
        $xmod = abs($space->y % 2);
        return array(
            'topLeft' => $this->getSpace($xmod + $space->x - 1, $space->y - 1, $space->z),
            'topRight' => $this->getSpace($xmod + $space->x, $space->y - 1, $space->z),
            'right' => $this->getSpace($space->x + 1, $space->y, $space->z),
            'bottomRight' => $this->getSpace($xmod + $space->x, $space->y + 1, $space->z),
            'bottomLeft' => $this->getSpace($xmod + $space->x - 1, $space->y + 1, $space->z),
            'left' => $this->getSpace($space->x - 1, $space->y, $space->z),
        );
    }

    public function getSpaceRotations($space)
    {
        $adjacent = $this->getSpaceAdjacents($space);
        $rotations = array(
            0 => array($space, $adjacent['bottomLeft'], $adjacent['bottomRight']),
            60 => array($space, $adjacent['left'], $adjacent['bottomLeft']),
            120 => array($space, $adjacent['topLeft'], $adjacent['left']),
            180 => array($space, $adjacent['topRight'], $adjacent['topLeft']),
            240 => array($space, $adjacent['right'], $adjacent['topRight']),
            300 => array($space, $adjacent['bottomRight'], $adjacent['right']),
        );
        return $rotations;
    }

    public function getSpaceTile($x, $y, $z, $r, $tile_type)
    {
        list($space0, $space1, $space2) = $this->getSpaceRotations($this->getSpace($x, $y, $z))[$r];
        $space0->new = true;
        $space0->r = $r;
        $space0->face = 0;
        $space1->new = true;
        $space1->r = $r;
        $space1->face = (int) substr($tile_type, 0, 1);
        $space2->new = true;
        $space2->r = $r;
        $space2->face = (int) substr($tile_type, 1, 1);
        return array($space0, $space1, $space2);
    }

    public function isConnected($space)
    {
        $adjacents = array_values($this->getSpaceAdjacents($space));
        foreach ($adjacents as $adj) {
            if (!$adj->isEmpty()) {
                return true;
            }
        }
        return false;
    }

    public function isValidPlacement($spaces)
    {
        list($space0, $space1, $space2) = $spaces;
        self::warn("test isValidPlacement for $space0 and $space1 and $space2 /");
        // First placement is always allowed
        if ($this->isEmpty()) {
            return true;
        }

        // All spaces must be empty
        if (!$space0->isEmpty() || !$space1->isEmpty() || !$space2->isEmpty()) {
            return false;
        }

        if ($space0->z > 1) {
            // Volcano must be above volcano of different rotation
            $below0 = $this->getSpaceBelow($space0);
            if ($below0->face !== VOLCANO || $below0->r === $space0->r) {
                return false;
            }

            // Other spaces must be supported
            $below1 = $this->getSpaceBelow($space1);
            $below2 = $this->getSpaceBelow($space2);
            if ($below1->isEmpty() || $below2->isEmpty()) {
                return false;
            }
        } else {
            // One space must be adjacent to the board
            $connected0 = $this->isConnected($space0);
            $connected1 = $this->isConnected($space1);
            $connected2 = $this->isConnected($space2);
            if (!$connected0 && !$connected1 && !$connected2) {
                return false;
            }
        }

        return true;
    }

    public function settlementAddSpace(&$settlement, $addSpace)
    {
        foreach ($settlement as $space) {
            $adjacents = array_values($this->getSpaceAdjacents($space));
            self::warn("Check if we can add $addSpace to adjacents /");
            if (array_search($addSpace, $adjacents) !== false) {
                self::warn("- Yes we can! /");
                $settlement[] = $addSpace;
                return true;
            }
            self::warn("- No we cannot! /");
        }
        return false;
    }

    public function settlementHasBuilding($settlement, $bldg_type)
    {
        foreach ($settlement as $space) {
            if ($space->bldg_type === $bldg_type) {
                return true;
            }
        }
        return false;
    }

    public function getBuildingOptions($space, $player_id)
    {
        self::warn("Ask buildings for $space: empty=" . $space->isEmpty() . " bldg_type=" . $space->bldg_type . " face=" . $space->face . " /");
        if (!$space->isEmpty() && !$space->bldg_type && $space->face !== VOLCANO) {
            self::warn("- Can place a building on $space /");
            // Huts always allowed, may place on multiple tiles
            $options = array(HUT => array());
            $adjacents = array_values($this->getSpaceAdjacents($space));
            foreach ($adjacents as $adj) {
                self::warn("-- adj $adj can have a hut? bldg_type={$adj->bldg_type} face={$adj->face} /");
                if (!$adj->isEmpty() && !$adj->bldg_type && $adj->face === $space->face) {
                    $options[HUT][] = $adj;
                }
            }

            // Determine settlements
            $settlements = array();
            foreach ($adjacents as $adj) {
                self::warn("Settlements for $space: Check adjacent $adj /");
                if (!$adj->isEmpty() && $adj->bldg_player_id == $player_id) {
                    $added = false;
                    foreach ($settlements as $settlement) {
                        self::warn("Trying to add $adj to existing settlement /");
                        if ($this->settlementAddSpace($settlement, $adj)) {
                            $added = true;
                            break;
                        }
                    }
                    if (!$added) {
                        self::warn("Creating new settlement with only $adj /");
                        $settlements[] = array($adj);
                    }
                }
            }

            self::warn("Settlements for $space: Count is " . count($settlements) . " /");
            foreach ($settlements as $settlement) {
                // Temple must be adjacent, no other temples, size 3 or larger
                if (!array_key_exists(TEMPLE, $options) && count($settlement) >= 3 && !$this->settlementHasBuilding($settlement, TEMPLE)) {
                    $options[TEMPLE] = true;
                }

                // Tower must be adjacent, no other towers, level 3 or higher
                if (!array_key_exists(TOWER, $options) && !$this->settlementHasBuilding($settlement, TOWER)) {
                    $options[TOWER] = true;
                }
            }

            return $options;
        }
        return null;
    }
}
