import { HostContainer } from "./host-container";
import * as Adaptive from "adaptivecards";
import {
        Spacing,
        ShowCardActionMode,
        Orientation,
        ActionAlignment,
        Size,
        TextColor,
        TextSize,
        TextWeight
    } from "adaptivecards";

export class BTImageContainer extends HostContainer {
    public renderTo(hostElement: HTMLElement) {
        this.cardHost.classList.add("bf-image-card");

        var frame = document.createElement("div");
        frame.className = "bf-image-frame";

        hostElement.appendChild(frame);
    }

    public getHostConfig(): Adaptive.HostConfig {
        return new Adaptive.HostConfig({
            spacing: {
                small: 3,
                default: 8,
                medium: 20,
                large: 30,
                extraLarge: 40,
                padding: 10
            },
            separator: {
                lineThickness: 1,
                lineColor: "#EEEEEE"
            },
            supportsInteractivity: false,
            fontFamily: "'Segoe UI', Calibri, Candara, Segoe, Optima, Arial, sans-serif;",
            fontSizes: {
                small: 12,
                default: 14,
                medium: 16,
                large: 19,
                extraLarge: 22
            },
            fontWeights: {
                lighter: 200,
                default: 400,
                bolder: 600
            },
            containerStyles: {
                default: {
                    backgroundColor: "#FFFFFF",
                    foregroundColors: {
                        default: {
                            default: "#FF101010",
                            subtle: "#b2101010"
                        },
                        accent: {
                            default: "#FF0000FF",
                            subtle: "#b20000FF"
                        },
                        good: {
                            default: "#FF008000",
                            subtle: "#b2008000"
                        },
                        warning: {
                            default: "#FFFFD700",
                            subtle: "#b2FFD700"
                        },
                        attention: {
                            default: "#FF8B0000",
                            subtle: "#b28B0000"
                        }
                    }
                },
                emphasis: {
                    backgroundColor: "#08000000",
                    foregroundColors: {
                        default: {
                            default: "#FF101010",
                            subtle: "#b2101010"
                        },
                        accent: {
                            default: "#FF0000FF",
                            subtle: "#b20000FF"
                        },
                        good: {
                            default: "#FF008000",
                            subtle: "#b2008000"
                        },
                        warning: {
                            default: "#FFFFD700",
                            subtle: "#b2FFD700"
                        },
                        attention: {
                            default: "#FF8B0000",
                            subtle: "#b28B0000"
                        }
                    }
                }
            },
            imageSizes: {
                small: 60,
                medium: 120,
                large: 180
            },
            actions: {
                maxActions: 5,
                spacing: Spacing.Default,
                buttonSpacing: 10,
                showCard: {
                    actionMode: ShowCardActionMode.Inline,
                    inlineTopMargin: 16
                },
                actionsOrientation: Orientation.Horizontal,
                actionAlignment: ActionAlignment.Left
            },
            adaptiveCard: {
                allowCustomStyle: false
            },
            imageSet: {
                imageSize: Size.Medium,
                maxImageHeight: 100
            },
            factSet: {
                title: {
                    color: TextColor.Default,
                    size: TextSize.Default,
                    isSubtle: false,
                    weight: TextWeight.Bolder,
                    wrap: true,
                    maxWidth: 150
                },
                value: {
                    color: TextColor.Default,
                    size: TextSize.Default,
                    isSubtle: false,
                    weight: TextWeight.Default,
                    wrap: true
                },
                spacing: 10
            }
        });
    }
}
